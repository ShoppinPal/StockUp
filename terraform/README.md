# Motivation

Automate queues and deadLetter queues setup. This is where the workers pull payloads from.

# Notes

1. After you have decided to destroy your SQS queue infrastructure by running following command:

    `$PROJECT_ROOT/terraform/docker-compose run terraform destroy`

    You must wait `60 seconds` after deleting a queue before you can create another with the same name.

2. This setup was tested with terraform version `0.10.8` as of this commit.

# References

1. Terraform AWS Provider: 
https://www.terraform.io/docs/providers/aws/

2. Terraform AWS SQS Queue: 
https://www.terraform.io/docs/providers/aws/r/sqs_queue.html

3. Terraform docker image:
https://github.com/hashicorp/docker-hub-images
