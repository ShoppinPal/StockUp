variable "Q_URL" {}
variable "DLQ_URL" {}
variable "aws_access_key" {}
variable "aws_secret_key" {}
variable "aws_sqs_access_key" {}
variable "aws_sqs_secret_key" {}
variable "vend_client_id" {}
variable "vend_client_secret" {}
variable "admin_password" {}

variable "vn_name" {}
variable "subnet_name" {}
variable "public_ip_name" {}
variable "network_interface_name" {}
variable "storage_account_name" {}
variable "storage_container_name" {}
variable "vm_name" {}

# Resource Group
resource "azurerm_resource_group" "test" {
  name     = "terraform_test"
  location = "East US"
}

# Virtual Network
resource "azurerm_virtual_network" "test" {
  name                = "acctvn"
  address_space       = ["10.0.0.0/16"]
  location            = "East US"
  resource_group_name = "${azurerm_resource_group.test.name}"
}

# Subnet
resource "azurerm_subnet" "test" {
  name                 = "acctsub"
  resource_group_name  = "${azurerm_resource_group.test.name}"
  virtual_network_name = "${azurerm_virtual_network.test.name}"
  address_prefix       = "10.0.2.0/24"
}

# Public IP address
resource "azurerm_public_ip" "test" {
  name                         = "publicIp"
  location                     = "East US"
  resource_group_name          = "${azurerm_resource_group.test.name}"
  public_ip_address_allocation = "static"

  tags {
    environment = "staging"
  }
}

# Network interface 
resource "azurerm_network_interface" "test" {
  name                = "acctni"
  location            = "East US"
  resource_group_name = "${azurerm_resource_group.test.name}"

  ip_configuration {
    name                          = "testconfiguration1"
    subnet_id                     = "${azurerm_subnet.test.id}"
    private_ip_address_allocation = "dynamic"
    public_ip_address_id = "${azurerm_public_ip.test.id}"
  }
}


# Storage account
# Note: Change storage account 'name' field if you want to recreate it in quick succession. Azure stores previous account name for some time!
resource "azurerm_storage_account" "test" {
  name                = "${var.storage_account_name}"
  resource_group_name = "${azurerm_resource_group.test.name}"
  location            = "eastus"
  account_type        = "Standard_LRS"

  tags {
    environment = "staging"
  }
}

# Storage Container
resource "azurerm_storage_container" "test" {
  name                  = "${var.storage_container_name}"
  resource_group_name   = "${azurerm_resource_group.test.name}"
  storage_account_name  = "${azurerm_storage_account.test.name}"
  container_access_type = "private"
}

# Virtual Machine
resource "azurerm_virtual_machine" "server" {

  location              = "East US"
  name                  = "${var.vm_name}"
  resource_group_name   = "${azurerm_resource_group.test.name}"
  network_interface_ids = ["${azurerm_network_interface.test.id}"]
  vm_size               = "Standard_A3"

  delete_os_disk_on_termination = true
  delete_data_disks_on_termination = true
  
  storage_image_reference {
    publisher = "Canonical"
    offer     = "UbuntuServer"
    sku       = "16.04-LTS"
    version   = "latest"
  }

  os_profile {
    computer_name  = "terraform"
    admin_username = "terraform"
    admin_password = "${var.admin_password}"
  }

  storage_os_disk {
    name          = "myosdisk1"
    vhd_uri       = "${azurerm_storage_account.test.primary_blob_endpoint}${azurerm_storage_container.test.name}/myosdisk1.vhd"
    caching       = "ReadWrite"
    create_option = "FromImage"
  }

  os_profile_linux_config {
    disable_password_authentication = false
  }

  provisioner "remote-exec" {
    inline = [
      "sudo apt-get install python-software-properties -y && ",
      "curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash - && ",
      "sudo apt-get install nodejs -y && ",
      "sudo apt-get install apt-transport-https ca-certificates curl software-properties-common -y && ",
      "curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add - && ",
      "sudo add-apt-repository 'deb [arch=amd64] https://download.docker.com/linux/ubuntu xenial stable' -y && ",
      "sudo apt-get update -y && ",
      "sudo apt-get install docker-ce -y && ",
      "sudo curl -L https://github.com/docker/compose/releases/download/1.16.1/docker-compose-`uname -s`-`uname -m` -o /usr/local/bin/docker-compose && ",
      "sudo chmod +x /usr/local/bin/docker-compose && ",
      "docker-compose --version && ",
      "echo 'export AWS_SQS_URL=${var.Q_URL}' >> ~/.bashrc && ",
      "echo 'export AWS_ACCESS_KEY_ID=${var.aws_access_key}' >> ~/.bashrc && ",
      "echo 'export AWS_SECRET_ACCESS_KEY=${var.aws_secret_key}' >> ~/.bashrc && ",
      "echo 'export AWS_SQS_ACCESS_KEY_ID=${var.aws_sqs_access_key}' >> ~/.bashrc && ",
      "echo 'export AWS_SQS_SECRET_ACCESS_KEY=${var.aws_sqs_secret_key}' >> ~/.bashrc && ",
      "echo 'export VEND_CLIENT_ID=${var.vend_client_id}' >> ~/.bashrc && ",
      "echo 'export VEND_CLIENT_SECRET=${var.vend_client_secret}' >> ~/.bashrc"
    ]

    connection {
      type     = "ssh"
      user     = "terraform"
      host     = "${azurerm_public_ip.test.ip_address}"
      password = "${var.admin_password}"
    }
  }

  provisioner "file" {
    source = "~/.ssh/id_rsa"
    destination = "~/.ssh/id_rsa"

    connection {
      type     = "ssh"
      user     = "terraform"
      host     = "${azurerm_public_ip.test.ip_address}"
      password = "${var.admin_password}"
    }
  }

  provisioner "file" {
    source = "~/.ssh/id_rsa.pub"
    destination = "~/.ssh/id_rsa.pub"

    connection {
      type     = "ssh"
      user     = "terraform"
      host     = "${azurerm_public_ip.test.ip_address}"
      password = "${var.admin_password}"
    }
  }

  provisioner "remote-exec" {
    inline = [
      "sudo chmod -R 700 ~/.ssh/ && ",
      "ssh-keyscan github.com >> ~/.ssh/known_hosts -y && ",
      "git clone --recursive git@github.com:ShoppinPal/warehouse.git && cd warehouse && ",
      "cp .env.example .env && cp worker.env.example worker.env"
    ]

    connection {
      type     = "ssh"
      user     = "terraform"
      host     = "${azurerm_public_ip.test.ip_address}"
      password = "${var.admin_password}"
    }
  }

}