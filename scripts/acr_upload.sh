#!/bin/bash

# Strict mode
set -euo pipefail

# Function to display usage
usage() {
  echo "Usage: $0 -v <version> [-w <workspace>]

Builds and pushes client and server Docker images with a semantic version tag
to the Azure Container Registry corresponding to the specified Terraform workspace.

Required:
  -v <version>    Semantic version tag for the images (e.g., 1.0.0, 1.1.0-beta.1).

Options:
  -w <workspace>  Specify the target Terraform workspace (environment like dev, staging, prod).
                  If not provided, the current workspace is used.
  -h              Display this help message."
  exit 1
}

# Default values
WORKSPACE=""
VERSION=""
PROJECT_NAME="ecoestate" # Assuming the project name used in Terraform

# Parse options
while getopts "v:w:h" opt; do
  case $opt in
    v) VERSION="$OPTARG" ;;
    w) WORKSPACE="$OPTARG" ;;
    h) usage ;;
    \?) echo "Invalid option: -$OPTARG" >&2; usage ;; # Use >&2 for errors
  esac
done
shift "$((OPTIND - 1))"

# --- Validation ---
# Check if version is provided
if [ -z "$VERSION" ]; then
  echo "Error: Version tag is required." >&2
  usage
fi

# Validate SemVer format (POSIX ERE compliant)
# Based on https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
# Replaced \d with [0-9] for better Bash compatibility
SEMVER_REGEX='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$'
# More detailed regex breakdown (optional, for reference):
# SEMVER_REGEX='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)'
# SEMVER_REGEX+='(?:-((?:0|[1-9][0-9]*|[0-9]*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9][0-9]*|[0-9]*[a-zA-Z-][0-9a-zA-Z-]*))*))?' # Optional Pre-release
# SEMVER_REGEX+='(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$' # Optional Build metadata

if ! [[ "$VERSION" =~ $SEMVER_REGEX ]]; then
    echo "Error: Invalid semantic version format: '$VERSION'" >&2
    echo "Please follow Semantic Versioning 2.0.0 (see https://semver.org/)" >&2
    exit 1
fi

# Change to the script's directory to ensure relative paths work
cd "$(dirname "$0")/.." # Go up one level from scripts/ to project root

# Check if required tools are installed
command -v terraform >/dev/null 2>&1 || { echo >&2 "Error: terraform is not installed. Aborting."; exit 1; }
command -v az >/dev/null 2>&1 || { echo >&2 "Error: Azure CLI (az) is not installed. Aborting."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo >&2 "Error: Docker is not installed. Aborting."; exit 1; }

# --- Terraform Workspace and ACR Setup ---
# Select workspace if provided
if [ -n "$WORKSPACE" ]; then
  echo "Selecting Terraform workspace: $WORKSPACE"
  if ! terraform -chdir=tf workspace select "$WORKSPACE"; then
    echo >&2 "Error: Failed to select Terraform workspace '$WORKSPACE'. Does it exist?"
    exit 1
  fi
else
  WORKSPACE=$(terraform -chdir=tf workspace show)
  echo "Using current Terraform workspace: $WORKSPACE"
fi

# Get ACR login server from Terraform output for the selected workspace
echo "Fetching ACR login server for workspace '$WORKSPACE' from Terraform outputs..."
ACR_LOGIN_SERVER=$(terraform -chdir=tf output -raw acr_login_server)
if [ -z "$ACR_LOGIN_SERVER" ]; then
  echo >&2 "Error: Could not retrieve ACR login server from Terraform outputs for workspace '$WORKSPACE'."
  echo >&2 "Ensure 'terraform apply' has been run successfully for this workspace."
  exit 1
fi
echo "Target ACR Login Server: $ACR_LOGIN_SERVER (for workspace '$WORKSPACE')"

# Login to the target ACR using Azure CLI credentials
# This command configures Docker authentication automatically.
echo "Logging in to ACR: $ACR_LOGIN_SERVER"
if ! az acr login --name "$ACR_LOGIN_SERVER"; then 
    echo >&2 "Error: Failed to login to ACR '$ACR_LOGIN_SERVER'. Ensure you are logged in with 'az login' and have permissions."
    exit 1
fi

# --- Docker Build and Push ---
# Define image names and the specific version tag
FRONTEND_IMAGE_NAME="$PROJECT_NAME/frontend"
BACKEND_IMAGE_NAME="$PROJECT_NAME/backend"
FRONTEND_IMAGE_TAG="$ACR_LOGIN_SERVER/$FRONTEND_IMAGE_NAME:$VERSION"
BACKEND_IMAGE_TAG="$ACR_LOGIN_SERVER/$BACKEND_IMAGE_NAME:$VERSION"

echo "Frontend Image: $FRONTEND_IMAGE_NAME, Version: $VERSION, Target Tag: $FRONTEND_IMAGE_TAG"
echo "Backend Image: $BACKEND_IMAGE_NAME, Version: $VERSION, Target Tag: $BACKEND_IMAGE_TAG"

# Build client image (tagging it directly for the target ACR)
echo "Building frontend image ($FRONTEND_IMAGE_NAME:$VERSION) for linux/amd64..."
if ! docker build --platform linux/amd64 -t "$FRONTEND_IMAGE_TAG" --target production ./client; then
    echo >&2 "Error: Failed to build frontend image."
    exit 1
fi

# Push client image to the target ACR
echo "Pushing frontend image to $ACR_LOGIN_SERVER..."
if ! docker push "$FRONTEND_IMAGE_TAG"; then
    echo >&2 "Error: Failed to push frontend image ($FRONTEND_IMAGE_TAG)."
    exit 1
fi
echo "Frontend image ($FRONTEND_IMAGE_TAG) pushed successfully to $ACR_LOGIN_SERVER."

# Build server image (tagging it directly for the target ACR)
echo "Building backend image ($BACKEND_IMAGE_NAME:$VERSION) for linux/amd64..."
if ! docker build --platform linux/amd64 -t "$BACKEND_IMAGE_TAG" --target production ./server; then
    echo >&2 "Error: Failed to build backend image."
    exit 1
fi

# Push server image to the target ACR
echo "Pushing backend image to $ACR_LOGIN_SERVER..."
if ! docker push "$BACKEND_IMAGE_TAG"; then
    echo >&2 "Error: Failed to push backend image ($BACKEND_IMAGE_TAG)."
    exit 1
fi
echo "Backend image ($BACKEND_IMAGE_TAG) pushed successfully to $ACR_LOGIN_SERVER."

echo "
✅ Images (Version: $VERSION) uploaded successfully to ACR ($ACR_LOGIN_SERVER) for workspace '$WORKSPACE'." 
