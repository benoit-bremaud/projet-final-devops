# Terraform blueprint for EC2 #2: the PRODUCTION SERVER (where the app runs).
# Twin of registry/main.tf, with ONE difference: the open ports.
#
# Key difference vs the registry: here we DO NOT write the SSH key to disk.
# The pipeline retrieves it via an "output" (see issue #12, the "Bridge").

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.92"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = "eu-west-3" # Paris (region required by the assignment)
}

# 1. Latest Ubuntu 24.04 LTS AMI - DYNAMIC lookup (no hardcoded ID).
#    Assignment constraint #1: the AMI must not be hardcoded.
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical (official Ubuntu publisher)

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
}

# 2. SSH key generated ON THE FLY by Terraform (assignment constraint #2: no
#    static key stored in the repo). tls_private_key builds the key pair.
resource "tls_private_key" "pk" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

# Register the PUBLIC part of the key in AWS so it gets installed on the server.
# UNIQUE name (distinct from the registry) to avoid any collision.
resource "aws_key_pair" "generated_key" {
  key_name   = "inscription-app-key"
  public_key = tls_private_key.pk.public_key_openssh
}

# 3. Security Group = the firewall. Open ONLY the required ports.
#    Assignment: "Frontend and API public, the rest private" -> 22 + 3000 + 8000 only.
resource "aws_security_group" "app_sg" {
  name        = "inscription-app-sg"
  description = "SSH (Ansible) + Front (3000) + API (8000)"

  ingress {
    description = "SSH - reserved for Ansible (configuration tool)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Frontend React - publicly accessible"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "API FastAPI - publicly accessible"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Adminer (8080) and MySQL (3306) are INTENTIONALLY not opened: "the rest private".

  egress {
    description = "Server can reach the internet (image pull, apt, etc.)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 4. The EC2 instance = the server itself.
resource "aws_instance" "app_server" {
  ami                    = data.aws_ami.ubuntu.id # the Ubuntu found in block 1
  instance_type          = "t3.micro"             # Free Tier eligible on THIS account (t2.micro is rejected here)
  key_name               = aws_key_pair.generated_key.key_name
  vpc_security_group_ids = [aws_security_group.app_sg.id]

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = {
    Name = "Terraform-App-Server"
  }
}

# 5. Outputs = what Terraform RETURNS after creation. The pipeline uses them
#    to wire Ansible to the new server (issue #12, the "Bridge").
output "instance_public_ip" {
  description = "Public IP of the application EC2"
  value       = aws_instance.app_server.public_ip
}

output "ssh_private_key" {
  description = "Generated SSH private key (the pipeline writes it to key.pem)"
  value       = tls_private_key.pk.private_key_pem
  sensitive   = true # hidden in logs: it's a secret
}
