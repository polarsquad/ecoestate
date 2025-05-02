output "resource_group_name" {
  description = "The name of the resource group where all resources are deployed"
  value       = azurerm_resource_group.main.name
}

output "acr_login_server" {
  description = "The login server URL for the Azure Container Registry"
  value       = module.acr.login_server
}

output "container_apps_endpoint" {
  description = "The URL endpoint for the Container Apps Environment"
  value       = module.container_apps.container_apps_environment_default_domain
}

output "frontend_app_url" {
  description = "The URL of the frontend Container App"
  value       = module.container_apps.frontend_url
}

output "backend_app_url" {
  description = "The URL of the backend Container App"
  value       = module.container_apps.backend_url
}
