# Prerequisites
The release require the following tools installed on the host:
- Installation

  ```  brew install git-flow  ```
- Initialize git-flow for the project

  ``` git checkout master && git-flow init -d ```

# To get started with a new release
Create a branch, update version, and add release notes by running `make-branch`
```
./scripts/release/make-branch
```
As part of this script you'll be asked to:
1. Update the version in package.json and npm-shrinkwrap.json
2. Write release notes in CHANGELOG.txt

  Almost every feature enhancement should be mentioned, with the most visible/exciting ones first. Use descriptive sentences and give context where appropriate.

  Bug fixes are worth mentioning if it's likely that they've affected lots of people, or if they were regressions in the previous version.

  Improvements to the code are not worth mentioning.

# To release a version
```
./scripts/releases/push-release
```

# If it’s a minor release (1.x.0), rather than a patch release (1.x.y)
1.Open a PR against develop to:

1. update CHANGELOG.txt to bring it in line with release.

2. bump the version in package.json and npm-shrinkwrap.json to the next minor version number with dev appended. For example, if you just released 1.4.0, update it to 1.5.0-dev.

2.Get the PR merged.

**Note** Above process is outlined for the version release on github. In conjunction with Circle CI the docker images will be generated and pushed to docker hub if commits are made in develop & master branch.

# Deployment
Deploying to staging is outlined as below :
- Pull image with lastest version tag and build number for example *staging-v1.x.x-b85*

  `docker pull staging-v1.x.x-b85`

- Tag above image as `staging`

  ```
    docker tag staging-v1.x.x-b85 staging
  docker push staging
  ```
Now you are ready to deploy it on staging environment.
