# Need to declare variables so that .tfvars can be reflected https://github.com/hashicorp/terraform/issues/445
variable "aws_access_key" {}
variable "aws_secret_key" {}
variable "aws_iam_access_key" {}
variable "aws_iam_secret_key" {}
variable "vend_client_id" {}
variable "vend_client_secret" {}
variable "admin_password" {}

variable "Q" {}
variable "DLQ" {}

provider "aws" {
  # WARNING: FIFO queues are only available in two regions
  #          currently: us-east-2 and us-west-2

  region     = "us-west-1"
  access_key = "${var.aws_iam_access_key}"
  secret_key = "${var.aws_iam_secret_key}"

}

module "sqs_queues" {
  source          = "./resources/aws"
  aws_access_key  = "${var.aws_access_key}"
  aws_secret_key  = "${var.aws_secret_key}"
  Q               = "${var.Q}"
  DLQ             = "${var.DLQ}"
}

output "Q_URL" {
  value = "${module.sqs_queues.Q_URL}"
}