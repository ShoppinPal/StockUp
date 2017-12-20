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
    command = "echo '\n\n \u007B \n' >> ../terraform.json"
  }

  provisioner "local-exec" {
      command = "echo '\u0022AWS_SQS_URL\u0022: \u0022${self.id}\u0022,' >> ../terraform.json"
  }

  provisioner "local-exec" {
      command = "echo '\u0022AWS_SQS_REGION\u0022: \u0022${var.aws_region}\u0022,' >> ../terraform.json"
  }

  provisioner "local-exec" {
      command = "echo '\u0022AWS_SQS_ACCESS_KEY_ID\u0022: \u0022${var.aws_access_key}\u0022,' >> ../terraform.json"
  }

  provisioner "local-exec" {
      command = "echo '\u0022AWS_SQS_SECRET_ACCESS_KEY\u0022: \u0022${var.aws_secret_key}\u0022 ' >> ../terraform.json"
  }

  provisioner "local-exec" {
    command = "echo '\n \u007D \n' >> ../terraform.json"
  }
}

output "Q_URL" {
  value = "${aws_sqs_queue.warehouse_workers_Q.id}"
  depends_on = ["aws_sqs_queue.warehouse_workers_Q"]
}