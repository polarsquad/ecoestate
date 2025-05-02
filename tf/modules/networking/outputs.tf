output "vnet_id" {
  description = "The ID of the virtual network"
  value       = azurerm_virtual_network.vnet.id
}

output "vnet_name" {
  description = "The name of the virtual network"
  value       = azurerm_virtual_network.vnet.name
}

output "subnet_id" {
  description = "The ID of the subnet for container apps"
  value       = azurerm_subnet.container_apps.id
}

output "subnet_name" {
  description = "The name of the subnet for container apps"
  value       = azurerm_subnet.container_apps.name
}
