# Need to declare variables so that .tfvars can be reflected https://github.com/hashicorp/terraform/issues/445

variable "aws_iam_access_key" {}
variable "aws_iam_secret_key" {}
variable "aws_region" {}

variable "Q" {}
variable "DLQ" {}

provider "aws" {
  # WARNING: FIFO queues are only available in two regions
  #          currently: us-east-2 and us-west-2

  region     = "${var.aws_region}"
  access_key = "${var.aws_iam_access_key}"
  secret_key = "${var.aws_iam_secret_key}"

}

module "sqs_queues" {
  source          = "./resources/aws"
  Q               = "${var.Q}"
  DLQ             = "${var.DLQ}"
  aws_region      = "${var.aws_region}"
  aws_access_key = "${var.aws_iam_access_key}"
  aws_secret_key = "${var.aws_iam_secret_key}"
}

output "Q_URL" {
  value = "${module.sqs_queues.Q_URL}"
}