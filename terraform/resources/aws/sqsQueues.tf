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
      command = "echo '\u201CAWS_SQS_URL\u201D: \u201C${self.id}\u201D,' >> ../terraform.json"
  }

  provisioner "local-exec" {
      command = "echo '\u201CAWS_SQS_REGION\u201D: \u201C${var.aws_region}\u201D,' >> ../terraform.json"
  }

  provisioner "local-exec" {
      command = "echo '\u201CAWS_SQS_ACCESS_KEY_ID\u201D: \u201C${var.aws_access_key}\u201D,' >> ../terraform.json"
  }

  provisioner "local-exec" {
      command = "echo '\u201CAWS_SQS_SECRET_ACCESS_KEY\u201D: \u201C${var.aws_secret_key}\u201D ' >> ../terraform.json"
  }

  provisioner "local-exec" {
    command = "echo '\n \u007D \n' >> ../terraform.json"
  }
}

output "Q_URL" {
  value = "${aws_sqs_queue.warehouse_workers_Q.id}"
  depends_on = ["aws_sqs_queue.warehouse_workers_Q"]
}