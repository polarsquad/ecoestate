locals {
  # Determine if a custom hostname is configured and if DNS zone info is provided
  configure_custom_domain = var.frontend_custom_hostname != null && var.dns_zone_name != null && var.dns_zone_resource_group_name != null

  # Derive DNS record names. Assumes dns_zone_name is a suffix of frontend_custom_hostname.
  # Example: frontend_custom_hostname = "www.example.com", dns_zone_name = "example.com"
  #          -> record_prefix = "www"
  # Example: frontend_custom_hostname = "example.com", dns_zone_name = "example.com" (apex)
  #          -> record_prefix = "" (will be adjusted to "@" for CNAME, "" for TXT asuid prefix)
  record_prefix = local.configure_custom_domain ? (
    var.frontend_custom_hostname == var.dns_zone_name ? "" : replace(var.frontend_custom_hostname, ".${var.dns_zone_name}", "")
  ) : null

  cname_record_name = local.record_prefix != null ? (local.record_prefix == "" ? "@" : local.record_prefix) : null
  txt_record_name   = local.record_prefix != null ? (local.record_prefix == "" ? "asuid" : "asuid.${local.record_prefix}") : null
}

resource "azurerm_log_analytics_workspace" "logs" {
  name                = "${var.project_name}-${var.environment}-logs"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = var.tags
}

resource "azurerm_container_app_environment" "environment" {
  name                       = "${var.project_name}-${var.environment}-env"
  location                   = var.location
  resource_group_name        = var.resource_group_name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.logs.id
  infrastructure_subnet_id   = var.subnet_id
  tags                       = var.tags
}

resource "azurerm_user_assigned_identity" "container_apps_identity" {
  name                = "${var.project_name}-${var.environment}-identity"
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

# Role assignment to allow the managed identity to pull images from ACR
resource "azurerm_role_assignment" "acr_pull" {
  scope                = var.acr_id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.container_apps_identity.principal_id
}

# Frontend Container App
resource "azurerm_container_app" "frontend" {
  name                         = "${var.project_name}-${var.environment}-frontend"
  container_app_environment_id = azurerm_container_app_environment.environment.id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"
  tags                         = var.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.container_apps_identity.id]
  }

  registry {
    server   = var.acr_login_server
    identity = azurerm_user_assigned_identity.container_apps_identity.id
  }

  ingress {
    external_enabled = true
    target_port      = 80
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  template {
    container {
      name   = "frontend"
      image  = "${var.acr_login_server}/${var.project_name}/frontend:${var.app_version}"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "BACKEND_URL"
        value = azurerm_container_app.backend.ingress[0].fqdn
      }
    }
    min_replicas = 1
    max_replicas = 5
  }
}

# Backend Container App
resource "azurerm_container_app" "backend" {
  name                         = "${var.project_name}-${var.environment}-backend"
  container_app_environment_id = azurerm_container_app_environment.environment.id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"
  tags                         = var.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.container_apps_identity.id]
  }

  registry {
    server   = var.acr_login_server
    identity = azurerm_user_assigned_identity.container_apps_identity.id
  }

  ingress {
    allow_insecure_connections = false
    external_enabled           = false
    target_port                = 3001
    transport                  = "http"
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  template {
    container {
      name   = "backend"
      image  = "${var.acr_login_server}/${var.project_name}/backend:${var.app_version}"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "NODE_ENV"
        value = var.environment
      }
    }
    min_replicas = 1
    max_replicas = 3
  }
}

resource "azurerm_dns_txt_record" "frontend_domain_validation" {
  count = local.configure_custom_domain && local.txt_record_name != null ? 1 : 0

  name                = local.txt_record_name
  zone_name           = var.dns_zone_name
  resource_group_name = var.dns_zone_resource_group_name
  ttl                 = 300
  record {
    value = azurerm_container_app.frontend.custom_domain_verification_id
  }
  tags = var.tags
}

resource "azurerm_container_app_custom_domain" "frontend_custom_domain" {
  count = local.configure_custom_domain ? 1 : 0

  name                     = var.frontend_custom_hostname
  container_app_id         = azurerm_container_app.frontend.id
  certificate_binding_type = "SniEnabled" # For managed certificates

  # For Azure-managed certificates, certificate_id is not provided.
  # Lifecycle ignore_changes might be needed if Azure auto-populates related fields.
  lifecycle {
    ignore_changes = [
      # Required when using an Azure-created Managed Certificate to prevent resource recreation.
      certificate_binding_type,
      container_app_environment_certificate_id
    ]
  }

  depends_on = [
    azurerm_container_app.frontend,
    azurerm_dns_txt_record.frontend_domain_validation # Ensure TXT record is attempted first
  ]
}

# CNAME record for the custom hostname
# Note: CNAME at the zone apex (e.g., "example.com") is generally not recommended.
# Azure DNS supports ALIAS records for this, which can point to Azure resources.
# If an apex domain is needed, consider azurerm_dns_alias_record pointing to the Container App.
# For this example, we use CNAME, which works for subdomains (e.g., www.example.com).
resource "azurerm_dns_cname_record" "frontend_app_cname" {
  count = local.configure_custom_domain && local.cname_record_name != null && local.cname_record_name != "@" ? 1 : 0 # Avoid CNAME @ for now

  name                = local.cname_record_name
  zone_name           = var.dns_zone_name
  resource_group_name = var.dns_zone_resource_group_name
  ttl                 = 300
  record              = azurerm_container_app.frontend.ingress[0].fqdn
  tags                = var.tags
}
