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
