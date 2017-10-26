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

# generate configuration as per the deployment environment
#_generate_config() {
#  #TODO: write configuration generate part here
#  ENVIRONMENT=$1
#  echo $ENVIRONMENT
#}
_setup_config() {
  ENVIRONMENT=$1
  ../node_modules/grunt-cli/bin/grunt configsetup:${ENVIRONMENT}
}
_deploy_setup() {
  ENVIRONMENT=$1
  ../node_modules/grunt-cli/bin/grunt deploy:${ENVIRONMENT}
}

  if [ "$2" = 'server/server.js' ]; then
        if [ -z "$MONGOLAB_URI" ]; then
          echo >&2 'error: MONGOLAB_URI is not set. You need to specify MONGOLAB_URI'
          exit 1
        fi
        if [ -z "$NODE_ENV" ]; then
          echo >&2 'error: NODE_ENV is not set. You need to specify NODE_ENV'
          exit 1
        fi
        if [ ! -z "$AWS_BUCKET" -a ! -z "$AWS_KEY" ]; then
          echo >&2 'error: SEEDFILE parameters are set.'
          if [ ! -z "$AWS_ACCESS_KEY_ID" -a ! -z "$AWS_SECRET_ACCESS_KEY" -a ! -z "$AWS_DEFAULT_REGION" ]; then
            echo >&2 'Info: Fetching seed file ...'
            $AWS_CLI s3api get-object --bucket $AWS_BUCKET --key $AWS_KEY server/boot/seed.json
            if [ $? -ne 0 ]; then
              echo >&2 'error: Failed to fetch seed file'
            fi
          else
            echo >&2 'error: anyone from AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION is not set.'
          fi
        fi
        _setup_config ${NODE_ENV}
        _deploy_setup ${NODE_ENV}
        #_generate_config ${NODE_ENV}
  fi
  # Change uid and gid of node user so it matches ownership of current dir
  MAP_NODE_UID=$PWD
  uid=$(stat -c '%u' "$MAP_NODE_UID")
  gid=$(stat -c '%g' "$MAP_NODE_UID")
  usermod -u $uid node 2> /dev/null && {
    groupmod -g $gid node 2> /dev/null || usermod -a -G $gid node
  }
  chown -R node:node .
  exec gosu node "$@"

exec "$@"
