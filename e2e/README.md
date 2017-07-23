# Warehouse - e2e Testing Document

## Prerequisites
#### Docker Compose
Compose is a tool for defining and running multi-container Docker applications
#### BaseUrl
This is the base url of warehouse app. Go to project's `docker-compose.yml` and scroll down to the
part that says: `e2e-protractor-test-runner-debug` > `command`. In this command, replace the current `baseUrl` with the `baseUrl` of your app.
## How To Run Test Cases
- In the app root directory, run `docker-compose up e2e-selenium-and-chrome-debug`. This will create
a container with image `selenium/standalone-chrome-debug`, details of which can be found here: https://github.com/SeleniumHQ/docker-selenium.
- In your mac spotlight, type `vnc://localhost:5900`. This will open a remote desktop access software which will allow you to view the tests running inside the docker container. 
- After the container is up, run `docker-compose run e2e-protractor-test-runner-debug` or simply `npm test`. This will run the tests specified in `protractor.conf.js`.
