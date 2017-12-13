# Deploy

1. Clone warehouse and any submodules

    ```
    git clone --recursive git@github.com:ShoppinPal/warehouse.git
    ```
1. Open project directory: `cd warehouse`
1. Setup project root directory as an environment variable:

    ```
    export PROJECT_ROOT=`pwd` && echo $PROJECT_ROOT
    ```
1. Copy the templates for configuring environment variables

    ```
    cp .env.example .env
    cp worker.env.example worker.env
    ```
    OR 
    
    you can run the command `npm run generate-env` , which will ask you for the environment variables to be configured. Once done, It will generate a .env file for you as per the values you specified. This utility uses npm module `inquirer`. Thus make sure you install it by running ```npm install inquirer --save```.
    
    This command also accepts an argument as `-e` where possible values are either `web` or `worker`. Choosing either one among them will allow you to generate env configuration for that environment.
    eg. 
    ```npm run generate-env``` or ```npm run generate-env -e=web``` for generating .env for warehouse web app.
    ```npm run generate-env -e=worker``` for generating .env for worker.

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