# Motivation

Automate queues and deadLetter queues setup. This is where the workers pull payloads from.

# How to run

1. git clone --recursive git@github.com:ShoppinPal/warehouse.git

2. Copy the templates for configuring environment variables
cp .env.example .env
cp worker.env.example worker.env

3. Then fill in the values for env variables into `.env` and `worker.env` files

4. Download and install Terraform at [https://www.terraform.io/downloads.html](https://www.terraform.io/downloads.html)
(Tested with Terraform v0.10.7 as of this writing)

5. Create **terraform.tfvars** under **$PROJECT_ROOT/terraform**. Add IAM access keys for provisioning queues: (Use **example.tfvars.file** as template)
    ```
        # Must have the appriopriate IAM permissions to manipulate SQS
        aws_iam_access_key      = ""
        aws_iam_secret_key      = ""
        Q                       = "terraform_warehouse_workers_Q"   # use whatever name you find useful
        DLQ                     = "terraform_warehouse_workers_DLQ" # use whatever name you find useful
    ```
    Note: File name should be **terraform.tfvars** so that terraform can autoload this file.
6. Run these commands under **$PROJECT_ROOT/terraform** directory:
    ```
        1. terraform init
        2. terraform get    // used to download and update modules mentioned in the root module (main.tf).
        3. terraform plan
        4. terraform apply
        5. terraform destroy // to destroy your infrastructure!
    ```
7. There is another folder called terraform-test. You can create an azure instance and sqs queues through it by following above instructions from point 4 (assuming points 1 - 4 are already completed). Follow from step 5 under **$PROJECT_ROOT/terraform/terraform-test** directory 

Note: This is for local development setup. Once terraform creates queues, appropriate AWS_SQS_URL will be added to .env and worker.env 