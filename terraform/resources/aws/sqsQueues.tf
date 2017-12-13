variable "Q" {}
variable "DLQ" {}
variable "aws_region" {}
variable "aws_access_key" {}
variable "aws_secret_key" {}

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
    command = "echo '\n##\n# Warehouse sends jobs/payloads to a queue so that a worker may pick them up and finish them off.\n# There are many technologies that can provide a queue implementation: SQS, RabbitMQ, redis, etc.\n##' >> ../.env"
  }

  provisioner "local-exec" {
    command = "echo '\n##\n# Warehouse sends jobs/payloads to a queue so that a worker may pick them up and finish them off.\n# There are many technologies that can provide a queue implementation: SQS, RabbitMQ, redis, etc.\n##' >> ../worker.env"
  }

  provisioner "local-exec" {
      command = "echo 'AWS_SQS_URL=${self.id}' >> ../.env && echo 'AWS_SQS_URL=${self.id}' >> ../worker.env"
  }

  provisioner "local-exec" {
      command = "echo 'AWS_SQS_REGION=${var.aws_region}' >> ../.env && echo 'AWS_SQS_REGION=${var.aws_region}' >> ../worker.env"
  }

  provisioner "local-exec" {
      command = "echo 'AWS_SQS_ACCESS_KEY_ID=${var.aws_access_key}' >> ../.env && echo 'AWS_SQS_ACCESS_KEY_ID=${var.aws_access_key}' >> ../worker.env"
  }

  provisioner "local-exec" {
      command = "echo 'AWS_SQS_SECRET_ACCESS_KEY=${var.aws_secret_key}' >> ../.env && echo 'AWS_SQS_SECRET_ACCESS_KEY=${var.aws_secret_key}' >> ../worker.env"
  }
}

output "Q_URL" {
  value = "${aws_sqs_queue.warehouse_workers_Q.id}"
  depends_on = ["aws_sqs_queue.warehouse_workers_Q"]
}