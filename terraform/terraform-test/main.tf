# Need to declare variables so that .tfvars can be reflected https://github.com/hashicorp/terraform/issues/445

variable "aws_access_key" {}
variable "aws_secret_key" {}

variable "Q" {}
variable "DLQ" {}

variable "azure_client_id" {}
variable "azure_client_secret" {}
variable "azure_subscription_id" {}
variable "azure_tenant_id" {}

provider "aws" {
  # WARNING: FIFO queues are only available in two regions
  #          currently: us-east-2 and us-west-2

  region     = "us-west-1"
  access_key = "${var.aws_access_key}"
  secret_key = "${var.aws_secret_key}"

}

# Install azure cli: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest
# Obtain below credentials after installing azure cli and following instructions at: https://www.terraform.io/docs/providers/azurerm/authenticating_via_service_principal.html

provider "azurerm" {
  client_id = "${var.azure_client_id}"
  client_secret = "${var.azure_client_secret}"
  subscription_id = "${var.azure_subscription_id}"
  tenant_id = "${var.azure_tenant_id}"
}

module "sqs_queues" {
  source = "./resources/aws"
  aws_access_key = "${var.aws_access_key}"
  aws_secret_key = "${var.aws_secret_key}"
  Q = "${var.Q}"
  DLQ = "${var.DLQ}"
}

module "azure_server" {
  source = "./resources/azure"
  Q_URL = "${module.sqs_queues.Q_URL}"
  DLQ_URL = "${module.sqs_queues.DLQ_URL}"
}

output "Q_URL" {
  value = "${module.sqs_queues.Q_URL}"
}