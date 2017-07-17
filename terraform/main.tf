/*
  Commands that can be run:

  * Planning stage:
      * Simple example:
        ```
        terraform plan
        ```
      * Configurable example:
        ```
        terraform plan \
          -var 'Q=pulkit-dev-warehouse-workers-Q' \
          -var 'DLQ=pulkit-dev-warehouse-workers-DLQ'
        ```
      * [Recommended] Configurable & Predictable example:
        ```
        # dev env
        terraform plan \
          -var 'Q=YOUR_FIRST_NAME-dev-warehouse-workers-Q' \
          -var 'DLQ=YOUR_FIRST_NAME-dev-warehouse-workers-DLQ' \
          -out plan.tfplan
        # staging env
        terraform plan \
          -var 'Q=staging-warehouse-workers-Q' \
          -var 'DLQ=staging-warehouse-workers-DLQ' \
          -out plan.tfplan
        # production env
        terraform plan \
          -var 'Q=warehouse-workers-Q' \
          -var 'DLQ=warehouse-workers-DLQ' \
          -out plan.tfplan
        ```
  * Execution stage:
      * Simple example:
        ```
        terraform apply
        ```
      * [Recommended] Predictable example:
        ```
        terraform apply plan.tfplan
        ```
  * Destruction stage:
    ```
    terraform destroy
    ```
*/

provider "aws" {
  # WARNING: FIFO queues are only available in two regions
  #          currently: us-east-2 and us-west-2
  region = "us-west-2"
}

resource "aws_sqs_queue" "warehouse_workers_DLQ" {
  #name                        = "warehouse-workers-DLQ"
  name                        = "${var.DLQ}"
  content_based_deduplication = false,
  delay_seconds               = 0,
  fifo_queue                  = false,
  max_message_size            = 262144,
  message_retention_seconds   = 1209600,
  receive_wait_time_seconds   = 0,
  visibility_timeout_seconds  = 30
}

resource "aws_sqs_queue" "warehouse_workers_Q" {
  #name                        = "warehouse-workers-Q",
  name                        = "${var.Q}"
  content_based_deduplication = false,
  delay_seconds               = 0,
  fifo_queue                  = false,
  max_message_size            = 262144,
  message_retention_seconds   = 1209600,
  receive_wait_time_seconds   = 10,
  redrive_policy              = "{\"deadLetterTargetArn\":\"${aws_sqs_queue.warehouse_workers_DLQ.arn}\",\"maxReceiveCount\":1}",
  visibility_timeout_seconds  = "1800" 
}
