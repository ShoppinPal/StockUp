# Warehouse - e2e Testing Document

## Prerequisites

#### Docker Compose
Compose is a tool for defining and running multi-container Docker applications

#### Setup `.env` file
1. Copy `.env.example` to `.env` file
2. Configure `.env` file with valid values for testing

## How To Run Test Cases
- In the app root directory, run `docker-compose up e2e-selenium-and-chrome-debug`. This will create a container with image `selenium/standalone-chrome-debug`, details of which can be found here: https://github.com/SeleniumHQ/docker-selenium.
- In your mac spotlight, type `vnc://<HOST>:5900`.
    - the HOST in this URL should be the same as the value configured for VM_EXTERNAL_IP
    - This will open a remote desktop access software which will allow you to view the tests running inside the docker container.
- After the container is up, use `npm run test`. This will run the tests specified in `protractor.conf.js`.
    - the underlying command that runs is: `docker-compose up e2e-protractor-test-runner-debug`
    - if you want to treat it as a test harness, use [scaling](https://docs.docker.com/compose/reference/up/) and run this command directly:
        - `SCALE=5 npm run stressTest`
            - each protractor run resembles one end-user
            - by increasing scale, you can simulate multiple end-users
