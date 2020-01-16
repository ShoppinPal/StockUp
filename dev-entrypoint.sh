#!/bin/bash
set -eo pipefail
AWS_CLI='/usr/local/bin/aws'
# if command starts with an option, prepend node
if [ "${1:0:1}" = '-' ]; then
        set -- node "$@"
fi
# skip setup if they want an option that stops node
wantHelp=
for arg; do
        case "$arg" in
                -'?'|--help|--print-defaults|-V|--version)
                        wantHelp=1
                        break
                        ;;
        esac
done

_config_setup() {
  ENVIRONMENT=$1
  echo "Setting up config for environment: "${ENVIRONMENT}
  ./node_modules/grunt-cli/bin/grunt configsetup:${ENVIRONMENT}
}

_deploy_setup() {
  ENVIRONMENT=$1
  echo "Deploying settings for environment: "${ENVIRONMENT}
  ./node_modules/grunt-cli/bin/grunt deploy:${ENVIRONMENT}
}


  if [ "$2" = 'server/server.js' ]; then
        _config_setup ${NODE_ENV}
        _deploy_setup ${NODE_ENV}
  fi

exec "$@"
