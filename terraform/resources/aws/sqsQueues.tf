variable "aws_access_key" {}
variable "aws_secret_key" {}
variable "Q" {}
variable "DLQ" {}

provider "aws" {
  # WARNING: FIFO queues are only available in two regions
  #          currently: us-east-2 and us-west-2

  region     = "us-west-1"
  access_key = "${var.aws_access_key}"
  secret_key = "${var.aws_secret_key}"

}

resource "aws_sqs_queue" "warehouse_workers_DLQ" {
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
  name                        = "${var.Q}"
  content_based_deduplication = false,
  delay_seconds               = 0,
  fifo_queue                  = false,
  max_message_size            = 262144,
  message_retention_seconds   = 1209600,
  receive_wait_time_seconds   = 10,
  redrive_policy              = "{\"deadLetterTargetArn\":\"${aws_sqs_queue.warehouse_workers_DLQ.arn}\",\"maxReceiveCount\":1}",
  visibility_timeout_seconds  = "1800" 

  provisioner "local-exec" {
      command = "echo 'AWS_SQS_URL=${self.id}' >> ../.env"
  }
}

output "Q_URL" {
  value = "${aws_sqs_queue.warehouse_workers_Q.id}"
  depends_on = ["aws_sqs_queue.warehouse_workers_Q"]
}