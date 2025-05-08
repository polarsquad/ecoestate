output "container_apps_environment_id" {
  description = "The ID of the Container Apps Environment"
  value       = azurerm_container_app_environment.environment.id
}

output "container_apps_environment_default_domain" {
  description = "The default domain of the Container Apps Environment"
  value       = azurerm_container_app_environment.environment.default_domain
}

output "frontend_id" {
  description = "The ID of the frontend Container App"
  value       = azurerm_container_app.frontend.id
}

output "frontend_url" {
  description = "The URL of the frontend Container App"
  value       = "https://${azurerm_container_app.frontend.ingress[0].fqdn}"
}

output "frontend_fqdn" {
  description = "The FQDN of the frontend Container App's ingress"
  value       = azurerm_container_app.frontend.ingress[0].fqdn
}

output "backend_id" {
  description = "The ID of the backend Container App"
  value       = azurerm_container_app.backend.id
}

output "backend_url" {
  description = "The URL of the backend Container App"
  value       = "https://${azurerm_container_app.backend.ingress[0].fqdn}"
}

output "container_apps_identity_id" {
  description = "The ID of the user assigned identity for Container Apps"
  value       = azurerm_user_assigned_identity.container_apps_identity.id
}

output "log_analytics_workspace_id" {
  description = "The ID of the Log Analytics workspace"
  value       = azurerm_log_analytics_workspace.logs.id
}

output "frontend_custom_domain_verification_id" {
  description = "The ID used by Azure for TXT record validation for the frontend custom domain. This is automatically used by the module to create the TXT record in Azure DNS if configured."
  value       = var.frontend_custom_hostname != null ? azurerm_container_app.frontend.custom_domain_verification_id : null
}
