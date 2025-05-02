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
  description = "The semantic version tag of the application images to deploy (e.g., 1.0.0)."
  type        = string
  # No default - this should be explicitly set per deployment
  # Example: set in terraform.tfvars or via -var="app_version=1.0.0"
}

variable "container_apps_environment_infrastructure_subnet_id" {
  description = "The ID of the subnet to use for the Container Apps Environment infrastructure"
  type        = string
  default     = null
}
