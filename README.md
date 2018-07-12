# warehouse

Replenishing stock is one of the most important repetitive tasks performed by a retailer, yet for majority of the retail world this process is highly inefficient and time consuming. We've created a (first of its kind) open-source and free iPad application that makes the stock ordering process fast and fun, and frees up a whole lot of time for store managers and warehouse folks. To top it off, this app works beautifully with your inventory and POS! Just let us know which system(s) you use and we can add the integration.

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/ShoppinPal/warehouse?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# Pre-requisites

- Install [Docker for Mac](https://download.docker.com/mac/stable/Docker.dmg) Or [Windows](https://download.docker.com/win/stable/InstallDocker.msi)
- Install [Docker Compose](https://docs.docker.com/compose/install/)

# Deployment Architecture
The deployment consists of the following key components (few aspects have been left out for the the sake of brevity).

![alt text](https://raw.githubusercontent.com/ShoppinPal/warehouse/feature/kamal/update-readme-with-architecture/client/app/images/Screen%20Shot%202018-07-12%20at%202.51.04%20PM.png)

### LoopBack (LB) Node Cluster
- LoopBack Node cluster is the frontend (responsive web app) for Warehouse used by the store and fulfillment center staff.
- This module only accept inputs and displays the results to the end user, while the heavy lifting is performed by the **worker cluster**.
- The LB cluster will be deployed in a fashion so that it will scale based on resources utilized on server as traffic increases towards the application. Auto-scaling can also help in mitigating some low scale attacks that happen on web applications generally.

### Worker Node Cluster
- Worker Node Cluster will perform all heavy operations such as communicating with POS/ERP APIs and updating the database. As this is the backend cluster and has to communicate with POS/ERP APIs as well as the Database, it will be hidden and within a secure environment.
Standard measures for security like IP whitelisting will be used to allow access from specific nodes.

### Database
- Warehouse uses MongoDB as the database. This will be deployed in a private cluster where only the Worker and LoopBack nodes can communicate with it. Here you have the option of using a hosted service such as MongoLab or setting up Mongo within your environment.

### Security measures
- User traffic can be filtered with Firewalls such as Apigee or CloudFlare (or any others currently being used in your environment) to prevent malicious traffic.
- All traffic exclusively over HTTPS.

# Deploy

1. [On remote machine with Docker while editing locally](docs/local-ide-remote-docker.md)
1. [Locally](docs/local.md) (not recommended)

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
1. If builds keep failing and it makes no-sence, maybe cleanup is required, try:
    ```
    docker system prune

    # either:
    docker-compose up -d --build --force-recreate
    # or:
    docker-compose up --build --force-recreate
    ```
1. If you performed a regular clone instead of a recursive clone, then correct this using the follwing command to get the submodules:

    ```
    cd $WAREHOUSE_HOME && git submodule update --init --recursive
    ```

# FAQs

* What is the difference between `docker-compose.local.yml` and `docker-compose.yml`?
    * The `docker-compose.local.yml` file is a close mirror of `docker-compose.yml` with a few small differences to ease the life of developers when developing or torubleshooting.
* How should we install dependencies based on the projects's nodejs version?
    * If you are performing this BEFORE the `Dockerfile` build, where the following command runs: `RUN mv /apps/warehouse/node_modules /apps/node_modules`, then use:

        ```
        docker-compose run nodejs node --version
        docker-compose run nodejs npm install
        ```
    * If you are performing this AFTER the `Dockerfile` build, where the following command runs: `RUN mv /apps/warehouse/node_modules /apps/node_modules`, then use:

        ```
        docker-compose run nodejs node --version
        docker-compose run nodejs npm --prefix /apps/warehouse install
        ```
* How should we add NEW dependencies based on the projects's nodejs version?
    * If you are performing this BEFORE the `Dockerfile` build, where the following command runs: `RUN mv /apps/warehouse/node_modules /apps/node_modules`, then use:
        ```
        docker-compose run nodejs npm install --save-dev --save-exact <someNewModule>
        docker-compose run nodejs npm install --save --save-exact <someNewModule>

        # NOTE: If you add a new module then please
        #       make sure to shrinkwrap it using:
        #       docker-compose run nodejs npm shrinkwrap
        ```
    * If you are performing this AFTER the `Dockerfile` build, where the following command runs: `RUN mv /apps/warehouse/node_modules /apps/node_modules`, then use:
        ```
        docker-compose run nodejs npm install --prefix /apps/warehouse --save-dev --save-exact <someNewModule>
        docker-compose run nodejs npm install --prefix /apps/warehouse --save --save-exact <someNewModule>

        # NOTE: If you add a new module then please
        #       make sure to shrinkwrap it using:
        #       docker-compose run nodejs npm shrinkwrap
        ```

# Remote Dev Machine

1. Setup dropbox on local machine
1. [Setup dropbox on remote machine](https://training.shoppinpal.com/setup-a-machine-in-the-cloud/setup-box/shared-filesystem/dropbox.html)
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
