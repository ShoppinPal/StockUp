#!/bin/bash

set -ex
# Read the version to be build image for
RAW_VERSION=$1
# Extract the exact version number
VERSION=$(echo $RAW_VERSION | sed 's/-.*//g')
BUILD_TAG="$VERSION-${CIRCLE_BUILD_NUM}"
scripts/build/tag ${RAW_VERSION} ${BUILD_TAG}

if [ "${CIRCLE_BRANCH}" = "master" ]; then
  scripts/build/tag ${BUILD_TAG} "prod-${BUILD_TAG}"
  docker push shoppinpal/warehouse:prod-${BUILD_TAG}
fi
if [ "${CIRCLE_BRANCH}" = "develop" ]; then
  scripts/build/tag ${BUILD_TAG} "stag-${BUILD_TAG}"
  docker push shoppinpal/warehouse:stag-${BUILD_TAG}
fi
