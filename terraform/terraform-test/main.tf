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

variable "github_email" {}

variable "azure_client_id" {}
variable "azure_client_secret" {}
variable "azure_subscription_id" {}
variable "azure_tenant_id" {}

provider "aws" {
  # WARNING: FIFO queues are only available in two regions
  #          currently: us-east-2 and us-west-2

  region     = "us-west-1"
  access_key = "${var.aws_iam_access_key}"
  secret_key = "${var.aws_iam_secret_key}"

}

# Install azure cli: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest
# Obtain below credentials after installing azure cli and following instructions at: https://www.terraform.io/docs/providers/azurerm/authenticating_via_service_principal.html

provider "azurerm" {
  client_id       = "${var.azure_client_id}"
  client_secret   = "${var.azure_client_secret}"
  subscription_id = "${var.azure_subscription_id}"
  tenant_id       = "${var.azure_tenant_id}"
}

module "sqs_queues" {
  source          = "./resources/aws"
  aws_access_key  = "${var.aws_access_key}"
  aws_secret_key  = "${var.aws_secret_key}"
  Q               = "${var.Q}"
  DLQ             = "${var.DLQ}"
}

module "azure_server_warehouse" {
  source                  = "./resources/azure"
  Q_URL                   = "${module.sqs_queues.Q_URL}"
  DLQ_URL                 = "${module.sqs_queues.DLQ_URL}"
  aws_access_key          = "${var.aws_access_key}" # Seperate key for s3?
  aws_secret_key          = "${var.aws_secret_key}" # Seperate key for s3?
  aws_sqs_access_key      = "${var.aws_iam_access_key}"
  aws_sqs_secret_key      = "${var.aws_iam_secret_key}"
  vend_client_id          = "${var.vend_client_id}"
  vend_client_secret      = "${var.vend_client_secret}"
  admin_password          = "${var.admin_password}"
  vn_name                 = "acctvn"
  subnet_name             = "acctsub"
  public_ip_name          = "publicIp"
  network_interface_name  = "acctni"
  storage_account_name    = "accsayogesh6"
  storage_container_name  = "vhds"
  vm_name                 = "warehouse-service"
}

output "Q_URL" {
  value = "${module.sqs_queues.Q_URL}"
}