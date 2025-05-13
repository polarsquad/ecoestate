variable "azure_subscription_id" {
  description = "The Azure Subscription ID to use for deploying resources."
  type        = string
}

variable "azure_tenant_id" {
  description = "The Azure Tenant ID associated with the subscription."
  type        = string
}
variable "rg_prefix" {
  description = "An optional additional prefix for the resource group"
  type        = string
  default     = ""
}

variable "project_name" {
  description = "The name of the project, used as a prefix for all resources"
  type        = string
  default     = "ecoestate"
}

# Environment is now controlled by Terraform workspace (terraform.workspace)

variable "location" {
  description = "The Azure region to deploy resources to"
  type        = string
  default     = "swedencentral"
}

variable "acr_sku" {
  description = "The SKU of the Azure Container Registry"
  type        = string
  default     = "Basic"
}

variable "app_version" {
  description = "The semantic version tag of the application images to deploy (e.g., 1.0.0). Only needed for initial deployment; subsequent image updates should use the deploy_app.sh script."
  type        = string
  nullable    = true
  default     = null
  # No longer mandatory for infrastructure-only changes
}

variable "container_apps_environment_infrastructure_subnet_id" {
  description = "The ID of the subnet to use for the Container Apps Environment infrastructure"
  type        = string
  default     = null
}

variable "dns_zone_name" {
  description = "The name of the Azure DNS zone to create the CNAME record in (e.g., 'yourdomain.com')."
  type        = string
  nullable    = true
  default     = null
}

variable "dns_zone_resource_group_name" {
  description = "The name of the resource group where the Azure DNS zone is located."
  type        = string
  nullable    = true
  default     = null
}

variable "frontend_cname_record_name" {
  description = "The subdomain for the frontend CNAME record (e.g., 'www', 'app'). If null, CNAME is not created."
  type        = string
  nullable    = true
  default     = null
}
