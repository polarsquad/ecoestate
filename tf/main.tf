terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
  backend "azurerm" {
    use_azuread_auth = true

    # For interactive development with Azure CLI
    use_cli = true

    # Note: Before initializing, ensure your Azure AD identity has 
    # "Storage Blob Data Owner" or "Storage Blob Data Contributor" role
    # on the storage account at the resource level (not just container level)

    # For CI/CD pipelines, you can use one of these authentication methods:
    # 1. Service Principal with Client Secret:
    # tenant_id     = "00000000-0000-0000-0000-000000000000"  # Set via ARM_TENANT_ID env var
    # client_id     = "00000000-0000-0000-0000-000000000000"  # Set via ARM_CLIENT_ID env var
    # client_secret = "your-client-secret"                    # Set via ARM_CLIENT_SECRET env var

    # 2. OpenID Connect for GitHub Actions:
    # use_oidc        = true                                   # Set via ARM_USE_OIDC env var
    # tenant_id       = "00000000-0000-0000-0000-000000000000" # Set via ARM_TENANT_ID env var
    # subscription_id = "00000000-0000-0000-0000-000000000000" # Set via ARM_SUBSCRIPTION_ID env var
    # client_id       = "00000000-0000-0000-0000-000000000000" # Set via ARM_CLIENT_ID env var

    # 3. Managed Identity (for resources running in Azure):
    # use_msi         = true                                   # Set via ARM_USE_MSI env var
    # subscription_id = "00000000-0000-0000-0000-000000000000" # Set via ARM_SUBSCRIPTION_ID env var
    # tenant_id       = "00000000-0000-0000-0000-000000000000" # Set via ARM_TENANT_ID env var
    # For User Assigned Managed Identity:
    # client_id       = "00000000-0000-0000-0000-000000000000" # Set via ARM_CLIENT_ID env var
  }
}

provider "azurerm" {
  features {}
}

locals {
  # Use terraform.workspace to determine the environment
  environment = terraform.workspace
  tags = {
    project     = "ecoestate"
    environment = local.environment
  }
}

resource "azurerm_resource_group" "main" {
  name     = "rg-${var.rg_prefix}${var.project_name}-${local.environment}"
  location = var.location
  tags     = local.tags
}

module "networking" {
  source              = "./modules/networking"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = local.environment
  project_name        = var.project_name
  tags                = local.tags
}

module "acr" {
  source              = "./modules/acr"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = local.environment
  project_name        = var.project_name
  acr_sku             = var.acr_sku
  tags                = local.tags
}

module "container_apps" {
  source              = "./modules/container_apps"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  environment         = local.environment
  project_name        = var.project_name
  acr_login_server    = module.acr.login_server
  acr_name            = module.acr.name
  acr_id              = module.acr.id
  vnet_id             = module.networking.vnet_id
  subnet_id           = module.networking.subnet_id
  app_version         = var.app_version
  tags                = local.tags

  depends_on = [
    module.acr,
    module.networking
  ]
}
