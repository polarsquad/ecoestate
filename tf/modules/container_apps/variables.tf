variable "project_name" {
  description = "The name of the project, used as a prefix for all resources"
  type        = string
}

variable "environment" {
  description = "The environment (dev, staging, prod)"
  type        = string
}

variable "resource_group_name" {
  description = "The name of the resource group"
  type        = string
}

variable "location" {
  description = "The Azure region to deploy resources to"
  type        = string
}

variable "acr_login_server" {
  description = "The login server URL for the Azure Container Registry"
  type        = string
}

variable "acr_name" {
  description = "The name of the Azure Container Registry"
  type        = string
}

variable "acr_id" {
  description = "The ID of the Azure Container Registry"
  type        = string
  default     = null
}

variable "vnet_id" {
  description = "The ID of the virtual network"
  type        = string
}

variable "subnet_id" {
  description = "The ID of the subnet for container apps"
  type        = string
}

variable "app_version" {
  description = "The semantic version tag of the application images to deploy"
  type        = string
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
