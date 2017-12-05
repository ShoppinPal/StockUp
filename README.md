# warehouse

Replenishing stock is one of the most important repetitive tasks performed by a retailer, yet for majority of the retail world this process is highly inefficient and time consuming. We've created a (first of its kind) open-source and free iPad application that makes the stock ordering process fast and fun, and frees up a whole lot of time for store managers and warehouse folks. To top it off, this app works beautifully with your inventory and POS! Just let us know which system(s) you use and we can add the integration.

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/ShoppinPal/warehouse?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# Pre-requisites

- Install [Docker for Mac](https://download.docker.com/mac/stable/Docker.dmg) Or [Windows](https://download.docker.com/win/stable/InstallDocker.msi)
- Install [Docker Compose](https://docs.docker.com/compose/install/)

# Deploy

1. Clone warehouse and any submodules

    ```
    git clone --recursive git@github.com:ShoppinPal/warehouse.git
    ```
1. Setup project root directory as an environment variable:

    ```
    export PROJECT_ROOT=`pwd` && echo $PROJECT_ROOT
    ```
1. Open project directory: `cd $PROJECT_ROOT`
1. Copy the templates for configuring environment variables

    ```
    cp .env.example .env
    cp worker.env.example worker.env
    ```
1. Move to the terraform directory:: `cd $PROJECT_ROOT/terraform`
    * Use `$PROJECT_ROOT/terraform/example.tfvars.file` as template:

        ```
        cp $PROJECT_ROOT/terraform/example.tfvars.file $PROJECT_ROOT/terraform/terraform.tfvars
        ```
    * Fill in the values for the env variables in `$PROJECT_ROOT/terraform/terraform.tfvars`
1. Run these commands:


    ```
    # Tested with Terraform v0.10.8 as of this commit.

    # step 1
    cd $PROJECT_ROOT/terraform/
    # step 2
    docker-compose run terraform init
    # step 3: used to download and update modules mentioned in the root module (main.tf).
    docker-compose run terraform get
    # step 4
    docker-compose run terraform plan
    # step 5
    docker-compose run terraform apply
    # step 6: to destroy your infrastructure!
    docker-compose run terraform destroy

    # Once terraform creates queues, the appropriate
    # AWS_SQS_URL and AWS_SQS_REGION will be
    # automatically added to your .env and worker.env files.
    ```
1. Fill in any remaining values that are empty in `.env` and `worker.env` files
1. Open file `/etc/hosts`: `sudo vim /etc/hosts`
    * Append the following line

        ```
        127.0.0.1 lb
        ```
1. To build and run, choose:
    * background: `docker-compose up -d --build`
    * foreground: `docker-compose up --build`
1. For local development, open application in your browser with url http://lb/

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

1. [Setup dropbox on remote machine](https://training.shoppinpal.com/setup-box-on-azure/setup-dropbox-on-azure.html)
1. On your remote machine, execute the instructions from the [Deploy](https://github.com/ShoppinPal/warehouse#deploy) section above.
1. Setup project root directory as an environment variable:
    * For example, if your cloned project resides at: `~/dev/warehouse`
    * then go there first: `cd ~/dev/warehouse`
    * then run the following command:

      ```
      export WAREHOUSE_HOME=`pwd` && echo $WAREHOUSE_HOME
      ```
    * Optionally, if you performed a regular clone instead of a recursive clone, then correct this using the follwing command to get the submodules:

      ```
      cd $WAREHOUSE_HOME && git submodule update --init --recursive
      ```
1. Before making our project sync-capable, let us add rules to prevent unnecessary stuff from syncing:

        ```
        # change this according to your needs before running
        export WAREHOUSE_SYNC_DIR_NAME=warehouse-sync-pr-xxx && echo $WAREHOUSE_SYNC_DIR_NAME

        # run this as-is
        mkdir -p ~/Dropbox/remote-dev/ && \
        cd ~/Dropbox && dropbox exclude add remote-dev/$WAREHOUSE_SYNC_DIR_NAME/.git && \
        cd ~/Dropbox && dropbox exclude add remote-dev/$WAREHOUSE_SYNC_DIR_NAME/node_modules && \
        cd ~/Dropbox && dropbox exclude add remote-dev/$WAREHOUSE_SYNC_DIR_NAME/client/app/bower_components && \
        cd ~/Dropbox && dropbox exclude add remote-dev/$WAREHOUSE_SYNC_DIR_NAME/warehouse-workers/.git && \
        cd ~/Dropbox && dropbox exclude add remote-dev/$WAREHOUSE_SYNC_DIR_NAME/warehouse-workers/node_modules
1. To check if they are now excluded, use `dropbox exclude list | grep remote-dev`
    * if an incorrect path was excluded, you can fix it with: `dropbox exclude remove /the/path`
1. Wire up your project root to be synced via Dropbox:
    * go to your WAREHOUSE_HOME: `cd $WAREHOUSE_HOME`
    * then run the following command:

        ```
        # make sure this is setup
        echo WAREHOUSE_SYNC_DIR_NAME=$WAREHOUSE_SYNC_DIR_NAME

        # make sure this is setup
        echo $WAREHOUSE_HOME

        # run as-is
        cd $WAREHOUSE_HOME && \
          ln -s `pwd` ~/Dropbox/remote-dev/$WAREHOUSE_SYNC_DIR_NAME
        ```
    * make sure it worked: `ls -alrt ~/Dropbox/remote-dev/`
1. When you check the status on your remote machine via your ssh terminal: `dropbox status` ... you will see that the sync has begun
    ```
    Syncing (353 files remaining)
    Indexing 353 files...
    ```
1. Setup dropbox on local machine
1. Dropbox's autosync will create a directory on your local machine, you can jump into it
    * setup `$WAREHOUSE_SYNC_DIR_NAME` on your local terminal too
    * make sure to run this command on your local terminal (NOT the ssh remote terminal): `cd ~/Dropbox/remote-dev/$WAREHOUSE_SYNC_DIR_NAME`
    * open your favorite IDE and start working
        * for example, visual studio can be opened with: `code ~/Dropbox/remote-dev/$WAREHOUSE_SYNC_DIR_NAME`
1. On your local machine use `selective sync` via the dropbox UI to prevent the transfer of bulky dependencies back to your local filesystem. Go ahead and exclude `node_modules` and `bower_components` etc from being synced back to your machine. This is all done via UI so it should be very easy.
    * `dropbox > preferences > account > selective sync > change settings...`
