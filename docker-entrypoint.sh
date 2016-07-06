#!/bin/bash
set -eo pipefail
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
  gosu node node_modules/grunt-cli/bin/grunt configsetup:${ENVIRONMENT}
}
_deploy_setup() {
  ENVIRONMENT=$1
  gosu node node_modules/grunt-cli/bin/grunt deploy:${ENVIRONMENT}
}

if [ "$1" = 'node' -a -z "$wantHelp" ]; then
  if [ "$2" = 'server/server.js' ]; then
        if [ -z "$MONGOLAB_URI" ]; then
          echo >&2 'error: MONGOLAB_URI is not set. You need to specify MONGOLAB_URI'
          exit 1
        fi
        if [ -z "$NODE_ENV" ]; then
          echo >&2 'error: NODE_ENV is not set. You need to specify NODE_ENV'
          exit 1
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
  exec gosu node "$@"
fi
exec "$@"
