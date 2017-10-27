# warehouse

Replenishing stock is one of the most important repetitive tasks performed by a retailer, yet for majority of the retail world this process is highly inefficient and time consuming. We've created a (first of its kind) open-source and free iPad application that makes the stock ordering process fast and fun, and frees up a whole lot of time for store managers and warehouse folks. To top it off, this app works beautifully with your inventory and POS! Just let us know which system(s) you use and we can add the integration.

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/ShoppinPal/warehouse?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# Pre-requisites

- Install [Docker for Mac](https://download.docker.com/mac/stable/Docker.dmg) Or [Windows](https://download.docker.com/win/stable/InstallDocker.msi)
- Install [Docker Compose](https://docs.docker.com/compose/install/)

# Deploy

```
# 1. clone warehouse and any submodules
git clone --recursive git@github.com:ShoppinPal/warehouse.git

# 2. open project directory
cd warehouse

# 3. copy the templates for configuring environment variables
cp .env.example .env
cp worker.env.example worker.env

# 4. then fill in the values for env variables
# into `.env` and `worker.env` files

# 5. cd into $PROJECT_ROOT/terraform/ directory.
cd terraform

# 6. Create terraform.tfvars under $PROJECT_ROOT/terraform/ directory. (Use $PROJECT_ROOT/terraform/example.tfvars.file as template.)
# Below is example.tfvars.file
    ```
        # Must have the appriopriate IAM permissions to manipulate SQS
        aws_iam_access_key      = ""
        aws_iam_secret_key      = ""
        Q                       = "terraform_warehouse_workers_Q"   # use whatever name you find useful
        DLQ                     = "terraform_warehouse_workers_DLQ" # use whatever name you find useful
    ```
# Note: File name should be terraform.tfvars so that terraform can autoload this file.

# 7. Run these commands under $PROJECT_ROOT/terraform/ directory:
    ```
        1. docker-compose run terraform init
        2. docker-compose run terraform get    // used to download and update modules mentioned in the root module (main.tf).
        3. docker-compose run terraform plan
        4. docker-compose run terraform apply
        5. docker-compose run terraform destroy // to destroy your infrastructure!
    ```
# Note: This is for local development setup. Once terraform creates queues, appropriate AWS_SQS_URL and AWS_SQS_REGION will be added to .env and worker.env. 
# Tested with Terraform v0.10.8 as of this commit.

# 8. Open file `/etc/hosts` and add following entry
#    127.0.0.1 lb
sudo vim /etc/hosts

# 6a. build and run in a detached state
docker-compose up -d --build

# 6b. build and run in the foreground
docker-compose up --build
```
Open application in your browser with url http://lb/

# Troubleshooting

1. To start and troubleshoot a docker image:

    ```
    ##
    # docker-compose run <service_name> /bin/bash
    ##
    docker-compose run web /bin/bash
    ```

1. To attach to a running container and troubleshoot:

    ```
    ##
    # docker-compose exec <service_name> /bin/bash
    ##
    docker-compose exec web /bin/bash
    ```

1. The `docker-compose.local.yml` file is a close mirror of ``docker-compose.yml` with a few small differences to ease the life of developers when developing or torubleshooting.

```
# install dependencies based on the projects's nodejs version
#       BEFORE the following command runs:
#       `RUN mv /apps/warehouse/node_modules /apps/node_modules`
docker-compose run nodejs node --version
docker-compose run nodejs npm install

# TIPS: to add NEW dependencies based on the projects's nodejs version
#       BEFORE the following command runs:
#       `RUN mv /apps/warehouse/node_modules /apps/node_modules`
docker-compose run nodejs npm install --save-dev --save-exact <someNewModule>
docker-compose run nodejs npm install --save --save-exact <someNewModule>

# TIPS: if you add a new module then please make sure to shrinkwrap it
docker-compose run nodejs npm shrinkwrap
```

```
# install dependencies based on the projects's nodejs version
#       AFTER the following command runs:
#       `RUN mv /apps/warehouse/node_modules /apps/node_modules`
docker-compose run nodejs node --version
docker-compose run nodejs npm --prefix /apps/warehouse install

# TIPS: to add NEW dependencies based on the projects's nodejs version
#       AFTER the following command runs:
#       `RUN mv /apps/warehouse/node_modules /apps/node_modules`
docker-compose run nodejs npm install --prefix /apps/warehouse --save-dev --save-exact <someNewModule>
docker-compose run nodejs npm install --prefix /apps/warehouse --save --save-exact <someNewModule>

# TIPS: if you add a new module then please make sure to shrinkwrap it
docker-compose run nodejs npm shrinkwrap
```

```
# if builds keep failing and it makes no-sence, maybe cleanup is required, try:
docker system prune
# either:
docker-compose up -d --build --force-recreate
# or:
docker-compose up --build --force-recreate
```

# Remote Dev Machine

1. Setup dropbox on local machine
1. [Setup dropbx on remote machine](https://training.shoppinpal.com/setup-a-machine-in-the-cloud/setup-box/shared-filesystem/dropbox.html)
1. Create a directory on your local machine to house any and all projects meant for remote development: `mkdir -p ~/Dropbox/rDev`
1. Go to the directory where you cloned warehouse locally, for example: `cd ~/dev/warehouse`
1. Then wire it up to your local Dropbox folder:

    ```
    ln -s `pwd` ~/Dropbox/rDev/warehouse
    ```
1. When you check the status on your remote machine/droplet via your ssh terminal: `~/bin/dropbox.py status` ... you will see that the sync has begun:

    ```
    ~/bin/dropbox.py status
    Syncing (239 files remaining)
    Downloading 239 files...
    ```
1. From now on whenever you work on your remote machine/droplet via your ssh terminal ... switch to the directory that has the sync enabled: `cd ~/Dropbox/rDev/warehouse/` to do your work.
    * prevent remote machine from syncing unnecessary stuff to dropbox:

        ```
        cd ~/Dropbox && dropbox exclude add rDev/warehouse/node_modules
        cd ~/Dropbox && dropbox exclude add rDev/warehouse/client/app/bower_components
        cd ~/Dropbox && dropbox exclude add rDev/warehouse-workers/node_modules
        ```
1. On your local machine use `selective sync` via the dropbox UI to prevent the transfer of bulky dependencies back to your local filesystem. Go ahead and exclude `node_modules` and `bower_components` etc from being synced back to your machine. This is all done via UI so it should be very easy.
    * `dropbox > preferences > account > selective sync > change settings...`
