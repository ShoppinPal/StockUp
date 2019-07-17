#!/bin/bash

set -e
# Read the version to be build image for
_RAW_VERSION=$1
_SHORT_SHA=$2
_BRANCH_NAME=$3
# Extract the exact version number
_VERSION=$(echo $_RAW_VERSION | sed 's/-.*//g')
_BUILD_TAG="v$_VERSION-b$_SHORT_SHA"

./scripts/build/tag ${_RAW_VERSION} ${_BUILD_TAG}
if [ "${_BRANCH_NAME}" == "master" ]; then
scripts/build/tag ${_BUILD_TAG} "production-${_BUILD_TAG}"
docker push shoppinpal/warehouse:production-${_BUILD_TAG}
fi
if [ "${_BRANCH_NAME}" == "develop" ]; then
scripts/build/tag ${_BUILD_TAG} "dev-${_BUILD_TAG}"
docker push shoppinpal/warehouse:dev-${_BUILD_TAG}
fi
if [[ "${_BRANCH_NAME}" =~ ^release.* ]]; then
scripts/build/tag ${_BUILD_TAG} "staging-${_BUILD_TAG}"
docker push shoppinpal/warehouse:staging-${_BUILD_TAG}
fi
