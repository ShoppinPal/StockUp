#!/bin/bash

set -o xtrace
set -e

# supervisord worker for stockup. Reproduces prod-stockup-worker.
#
# This host is NOT a Swarm node. It runs two supervisord program groups
# directly on the host under Node 6:
#
#   worker-v2  numprocs=2  workers/sqsWorker.js
#   worker-v3  numprocs=1  workers/syncWorker.js
#
# The apt flags below keep upgrades non-interactive and keep existing configs.
export DEBIAN_FRONTEND=noninteractive
export UCF_FORCE_CONFFOLD=1
export NEEDRESTART_MODE=a
sudo -E apt-get update
sudo -E apt-get -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" upgrade
sudo -E apt-get install -y git curl build-essential supervisor apt-transport-https gnupg

# ---------------------------------------------------------------------------
# The ubuntu user
# ---------------------------------------------------------------------------
# AWS's Ubuntu AMI ships a default "ubuntu" user; DigitalOcean's image does
# not -- it gives you root only. Everything on this host is pinned to that
# account: the checkout lives at /home/ubuntu/workers, nvm at
# /home/ubuntu/.nvm, and both supervisor programs run `user=ubuntu` with the
# node binary addressed by absolute path under that home directory.
#
# So the user is created rather than the paths rewritten. Rewriting them
# would mean the supervisor conf files could no longer be copied across
# unchanged, and those files are the thing most worth keeping identical.
if ! id -u ubuntu >/dev/null 2>&1; then
  sudo useradd -m -s /bin/bash ubuntu
  sudo usermod -aG sudo ubuntu
fi

# Same SSH access as root already has, so the account is reachable for
# operational work the way it is on AWS.
sudo install -d -m 0700 -o ubuntu -g ubuntu /home/ubuntu/.ssh
sudo cp /root/.ssh/authorized_keys /home/ubuntu/.ssh/authorized_keys
sudo chown ubuntu:ubuntu /home/ubuntu/.ssh/authorized_keys
sudo chmod 600 /home/ubuntu/.ssh/authorized_keys

# ---------------------------------------------------------------------------
# Node 6.10.3 via nvm, as the ubuntu user
# ---------------------------------------------------------------------------
# Pinned to exactly the version on the AWS host. Node 6 has been end-of-life
# since April 2019; it is kept here because this migration changes the host
# and nothing else, and upgrading the runtime under a codebase this old is its
# own project with its own testing.
#
# The binary is from 2017 and links against a much older glibc than jammy's
# 2.35. glibc is backward compatible so it is expected to run, but this is the
# single highest-risk assumption on this host: if it fails, nothing else here
# matters. Verify immediately after boot with `node -v` as the ubuntu user.
sudo -u ubuntu -H bash -lc 'curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash'
sudo -u ubuntu -H bash -lc 'export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm install 6.10.3; nvm alias default 6.10.3; node -v'

# Put node on the system PATH as well. supervisord starts the workers by
# absolute path, but its PATH has no nvm, and excel-stream (the CSV/XLSX PO
# import) spawns a `#!/usr/bin/env node` child. Without this every file import
# fails with "/usr/bin/env: 'node': No such file or directory" -- and the
# worker still logs "Successfully created orders", so nothing surfaces to the
# merchant. Missed on the 24 Sep 2026 rebuild; applied by hand on 28 Sep.
sudo ln -sf /home/ubuntu/.nvm/versions/node/v6.10.3/bin/node /usr/local/bin/node
sudo -u ubuntu env -i PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin /usr/bin/env node -v

# ---------------------------------------------------------------------------
# Application checkout
# ---------------------------------------------------------------------------
# Pinned to the same commit the web tier runs, rather than a branch, so both
# hosts stay on identical code.
#
# npm-shrinkwrap.json is committed in that repo, so `npm install` resolves to
# the same dependency tree the AWS host has.
sudo -u ubuntu -H bash -lc 'git clone https://github.com/ShoppinPal/warehouse.git /home/ubuntu/workers'
sudo -u ubuntu -H bash -lc 'cd /home/ubuntu/workers && git checkout e2f6dfd'
sudo -u ubuntu -H bash -lc 'export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; cd /home/ubuntu/workers && npm install --production'
sudo -u ubuntu -H bash -lc 'export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; cd /home/ubuntu/workers/workers && npm install --production'

# ---------------------------------------------------------------------------
# supervisord programs
# ---------------------------------------------------------------------------
# The worker-v2/worker-v3 supervisor conf files are copied from the existing
# host during cutover, not rendered here. They are not kept in this repo.
#
# The node path inside them (/home/ubuntu/.nvm/versions/node/v6.10.3/bin/node)
# is identical on this host, so they transfer unchanged.

# Deliberately NOT started on first boot. These workers consume the live
# production SQS queues; starting them while the AWS workers are still running
# would put two consumers on one queue, which is how messages get
# double-processed or lost. Started by hand during the cutover window.
sudo systemctl enable supervisor
sudo supervisorctl reread || true

# ---------------------------------------------------------------------------
# node_exporter
# ---------------------------------------------------------------------------
useradd --no-create-home --shell /usr/sbin/nologin node_exporter || true
curl -fsSL https://github.com/prometheus/node_exporter/releases/download/v1.8.2/node_exporter-1.8.2.linux-amd64.tar.gz -o /tmp/node_exporter.tar.gz
tar -xzf /tmp/node_exporter.tar.gz -C /tmp
sudo install -m 0755 /tmp/node_exporter-1.8.2.linux-amd64/node_exporter /usr/local/bin/node_exporter
rm -rf /tmp/node_exporter.tar.gz /tmp/node_exporter-1.8.2.linux-amd64

cat <<'EOF' | sudo tee /etc/systemd/system/node_exporter.service > /dev/null
[Unit]
Description=Prometheus node exporter
After=network-online.target

[Service]
User=node_exporter
ExecStart=/usr/local/bin/node_exporter
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter

# ---------------------------------------------------------------------------
# Daily restart cron
# ---------------------------------------------------------------------------
# Reproduced from the AWS host's root crontab. A blanket daily restart of all
# workers is a workaround rather than a design. Carried over so behaviour is
# unchanged; worth removing once the underlying fault is understood.
echo "5 11 * * * root /usr/bin/supervisorctl restart all" | sudo tee /etc/cron.d/stockup-worker-restart > /dev/null
sudo chmod 644 /etc/cron.d/stockup-worker-restart

echo "Worker provisioned. supervisord is enabled but NOT started -- start it"
echo "during the cutover window, after the AWS workers are stopped."
