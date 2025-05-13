#!/bin/bash
set -e

# Help text function
show_help() {
  echo "Usage: $0 -g RESOURCE_GROUP -n APP_NAME -i IMAGE_REFERENCE [-h]"
  echo
  echo "Updates an Azure Container App with a new container image reference using the --image flag."
  echo
  echo "Options:"
  echo "  -g    Resource group name containing the Container App"
  echo "  -n    Container App name to update"
  echo "  -i    Full image reference (e.g. myacr.azurecr.io/myapp/backend:v1.2.3)"
  echo "  -h    Show this help message"
  echo
  echo "Example:"
  echo "  $0 -g myproject-prod-rg -n myproject-prod-frontend -i myacr.azurecr.io/myproject/frontend:v1.2.3"
}

# Parse arguments
while getopts "g:n:i:h" opt; do
  case $opt in
    g) RESOURCE_GROUP="$OPTARG" ;;
    n) APP_NAME="$OPTARG" ;;
    i) IMAGE_REFERENCE="$OPTARG" ;;
    h) show_help; exit 0 ;;
    *) show_help; exit 1 ;;
  esac
done

# Validate required parameters
if [ -z "$RESOURCE_GROUP" ] || [ -z "$APP_NAME" ] || [ -z "$IMAGE_REFERENCE" ]; then
  echo "Error: Missing required parameters"
  show_help
  exit 1
fi

echo "Updating Container App '$APP_NAME' in resource group '$RESOURCE_GROUP'"
echo "New image: $IMAGE_REFERENCE"

# Ensure the user is logged in to Azure
if ! az account show &>/dev/null; then
  echo "You are not logged in to Azure. Please run 'az login' first."
  exit 1
fi

# Apply the updated image directly
echo "Applying the updated image to the Container App..."
az containerapp update \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --image "$IMAGE_REFERENCE"

echo "Container App '$APP_NAME' successfully updated with image: $IMAGE_REFERENCE" 
