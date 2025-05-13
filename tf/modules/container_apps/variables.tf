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
  description = "The version tag of the app images to deploy. For initial deployment only, updates should use the deploy scripts."
  type        = string
  nullable    = true
  default     = "latest"
}

variable "dns_zone_name" {
  description = "The name of the Azure DNS zone for CNAME and TXT records. Required if frontend_custom_hostname is set."
  type        = string
  nullable    = true
  default     = null
}

variable "dns_zone_resource_group_name" {
  description = "The name of the resource group where the Azure DNS zone is located. Required if frontend_custom_hostname is set."
  type        = string
  nullable    = true
  default     = null
}

variable "frontend_custom_hostname" {
  description = "The custom hostname for the frontend (e.g., 'www.yourdomain.com'). If null or empty, custom domain won't be configured."
  type        = string
  nullable    = true
  default     = null
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
