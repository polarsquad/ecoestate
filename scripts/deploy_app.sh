#!/bin/bash
set -e

# Help text function
show_help() {
  echo "Usage: $0 -g RESOURCE_GROUP -p PROJECT_NAME -e ENVIRONMENT -v VERSION -r REGISTRY_URL [-h]"
  echo
  echo "Deploys a new version of the application by updating frontend and backend container apps"
  echo
  echo "Options:"
  echo "  -g    Resource group name containing the Container Apps"
  echo "  -p    Project name prefix used in the container app names"
  echo "  -e    Environment (dev, staging, prod)"
  echo "  -v    Version tag to deploy (e.g., v1.2.3)"
  echo "  -r    ACR registry URL (e.g., myacr.azurecr.io)"
  echo "  -h    Show this help message"
  echo
  echo "Example:"
  echo "  $0 -g myproject-prod-rg -p myproject -e prod -v v1.2.3 -r myacr.azurecr.io"
}

# Parse arguments
while getopts "g:p:e:v:r:h" opt; do
  case $opt in
    g) RESOURCE_GROUP="$OPTARG" ;;
    p) PROJECT_NAME="$OPTARG" ;;
    e) ENVIRONMENT="$OPTARG" ;;
    v) VERSION="$OPTARG" ;;
    r) REGISTRY_URL="$OPTARG" ;;
    h) show_help; exit 0 ;;
    *) show_help; exit 1 ;;
  esac
done

# Validate required parameters
if [ -z "$RESOURCE_GROUP" ] || [ -z "$PROJECT_NAME" ] || [ -z "$ENVIRONMENT" ] || [ -z "$VERSION" ] || [ -z "$REGISTRY_URL" ]; then
  echo "Error: Missing required parameters"
  show_help
  exit 1
fi

# Set app names based on naming convention
FRONTEND_APP_NAME="${PROJECT_NAME}-${ENVIRONMENT}-frontend"
BACKEND_APP_NAME="${PROJECT_NAME}-${ENVIRONMENT}-backend"

# Set image references
FRONTEND_IMAGE="${REGISTRY_URL}/${PROJECT_NAME}/frontend:${VERSION}"
BACKEND_IMAGE="${REGISTRY_URL}/${PROJECT_NAME}/backend:${VERSION}"

# Ensure the update_container_app_image.sh script exists and is executable
SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
UPDATE_SCRIPT="${SCRIPT_DIR}/update_container_app_image.sh"

if [ ! -f "$UPDATE_SCRIPT" ] || [ ! -x "$UPDATE_SCRIPT" ]; then
  echo "Error: update_container_app_image.sh script not found or not executable"
  echo "Expected location: $UPDATE_SCRIPT"
  exit 1
fi

# Update the frontend app
echo "=== Updating frontend app ==="
"$UPDATE_SCRIPT" -g "$RESOURCE_GROUP" -n "$FRONTEND_APP_NAME" -i "$FRONTEND_IMAGE"

# Update the backend app
echo -e "\n=== Updating backend app ==="
"$UPDATE_SCRIPT" -g "$RESOURCE_GROUP" -n "$BACKEND_APP_NAME" -i "$BACKEND_IMAGE"

echo -e "\n=== Deployment completed successfully ==="
echo "Frontend image: $FRONTEND_IMAGE"
echo "Backend image: $BACKEND_IMAGE" 
