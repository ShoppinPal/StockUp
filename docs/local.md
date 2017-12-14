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
1. Setup the environment files
    * run: `npm install inquirer --save-dev`
    * then run the command `npm run generate-env -e=web` for generating `.env` for warehouse web service
        * It will ask you for the environment variables to be configured.
        * Once done, it will generate files for you as per the values you specified.
    * then run the command `npm run generate-env -e=worker` for generating `worker.env` for warehouse worker service.
    * `@Bhushan001` we need `worker2.env` as well
    * Once these env files are generated, you can go ahead and run the terraform scripts in the next step to add-on [SQS](https://aws.amazon.com/sqs/) infrastructure.
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