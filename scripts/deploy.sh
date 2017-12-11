#!/bin/bash

set -e
# Read the version to be build image for
RAW_VERSION=$1
# Extract the exact version number
VERSION=$(echo $RAW_VERSION | sed 's/-.*//g')
BUILD_TAG="v$VERSION-b${CIRCLE_BUILD_NUM}"
scripts/build/tag ${RAW_VERSION} ${BUILD_TAG}
docker login -u ${DOCKER_USER} -p ${DOCKER_PASS}

if [ "${CIRCLE_BRANCH}" = "master" ]; then
  scripts/build/tag ${BUILD_TAG} "production-${BUILD_TAG}"
  docker push shoppinpal/warehouse:production-${BUILD_TAG}
fi
if [ "${CIRCLE_BRANCH}" = "develop" ]; then
  scripts/build/tag ${BUILD_TAG} "dev-${BUILD_TAG}"
  scripts/build/tag ${BUILD_TAG} "dev"
  docker push shoppinpal/warehouse:dev-${BUILD_TAG}
  docker push shoppinpal/warehouse:dev
fi

if [[ "${CIRCLE_BRANCH}" =~ ^release.* ]]; then
  scripts/build/tag ${BUILD_TAG} "staging-${BUILD_TAG}"
  scripts/build/tag ${BUILD_TAG} "staging"
  docker push shoppinpal/warehouse:staging-${BUILD_TAG}
  docker push shoppinpal/warehouse:staging
fi
