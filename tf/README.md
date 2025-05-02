# EcoEstate - Azure Infrastructure as Code

This directory contains Terraform configuration for deploying the EcoEstate application to Azure. The infrastructure consists of:

1. Azure Container Registry (ACR) for storing Docker images
2. Azure Container Apps for running the containerized applications
3. Virtual Network and Subnet for networking isolation

## Architecture

The deployment creates:

- A Resource Group containing all resources
- A Virtual Network with a delegated subnet for Container Apps
- An Azure Container Registry for storing application images
- A Log Analytics workspace for monitoring
- A Container Apps Environment
- Two Container Apps (frontend and backend)
- A User-Assigned Managed Identity with appropriate permissions

## Prerequisites

- [Terraform](https://www.terraform.io/downloads.html) (v1.0.0+)
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) (latest version)
- An Azure subscription

## Using Terraform Workspaces

This configuration uses Terraform workspaces to manage different environments (e.g., dev, staging, prod) with the same Terraform code. Workspaces allow you to have separate state files for different environments while sharing the same configuration.

### Available Commands

- List all workspaces:
  ```bash
  terraform workspace list
  ```

- Create a new workspace:
  ```bash
  terraform workspace new <workspace-name>
  ```
  Example: `terraform workspace new dev`, `terraform workspace new staging`, `terraform workspace new prod`

- Select a workspace:
  ```bash
  terraform workspace select <workspace-name>
  ```
  Example: `terraform workspace select dev`

- Show current workspace:
  ```bash
  terraform workspace show
  ```

The default workspace is named "default". You should create and select your desired workspace before running Terraform commands.

## Azure AD / Entra ID Authentication

This project uses Azure AD/Entra ID for state storage authentication instead of storage keys:

- Configured via `use_azuread_auth = true` in the backend block
- For local development: uses Azure CLI auth (`use_cli = true`) - run `az login` first
- For CI/CD: supports Service Principal, Managed Identity, or OIDC authentication

**Important**: Before initializing Terraform, ensure your Azure identity (user or service principal) has the **"Storage Blob Data Owner"** role assigned on the storage account (not just at the container level). This role assignment must be made at the storage account resource level.

## Deployment Instructions

1. **Login to Azure**

```bash
az login
```

2. **Set up Storage Account Permissions**

Ensure your user has the necessary permissions on the storage account:

```bash
# Set variables
RESOURCE_GROUP="your-terraform-state-rg"
STORAGE_ACCOUNT="yourterraformstatesa"
USER_PRINCIPAL_NAME=$(az ad signed-in-user show --query userPrincipalName -o tsv)

# Assign Storage Blob Data Owner role
az role assignment create \
  --role "Storage Blob Data Owner" \
  --assignee "$USER_PRINCIPAL_NAME" \
  --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT"
```

3. **Configure Terraform Backend**

Create a new file named `backend.tfvars` (not tracked in git) with the following content:

```hcl
resource_group_name  = "your-terraform-state-rg"
storage_account_name = "yourterraformstatesa"
container_name       = "tfstate"
key                  = "ecoestate.tfstate"
```

4. **Initialize Terraform**

```bash
terraform init -backend-config=backend.tfvars
```

5. **Create and Select Workspace**

```bash
# Create and select a new workspace (e.g., dev, staging, prod)
terraform workspace new dev

# Or select an existing workspace
terraform workspace select dev
```

6. **Customize Deployment Variables (Optional)**

Create a `terraform.tfvars` file to override default values and specify the application version:

```hcl
project_name = "ecoestate"
location     = "swedencentral"
acr_sku      = "Basic"
app_version  = "1.0.0" # Specify the image tag to deploy
```

Alternatively, pass variables via the command line:

```bash
terraform plan -var="app_version=1.0.0" -out=tfplan
```

7. **Plan the Deployment**

```bash
terraform plan -var="app_version=<your-version>" -out=tfplan
# Example:
# terraform plan -var="app_version=1.0.0" -out=tfplan
```

8. **Apply the Deployment**

```bash
terraform apply tfplan
```

## Environment-Specific Deployments

Deploy specific image versions to different environments:

```bash
# Deploy version 1.0.0 to dev
terraform workspace select dev
terraform plan -var="app_version=1.0.0" -out=tfplan
terraform apply tfplan

# Deploy version 1.0.0 to staging (after testing in dev)
terraform workspace select staging
terraform plan -var="app_version=1.0.0" -out=tfplan
terraform apply tfplan

# Deploy version 1.1.0 to dev
terraform workspace select dev
terraform plan -var="app_version=1.1.0" -out=tfplan
terraform apply tfplan
```

Resources created in each workspace will include the workspace name in their names to ensure clear identification across environments.

## Module Structure

- **Main Module** (`tf/`): Root module that orchestrates all resources
- **ACR Module** (`tf/modules/acr/`): Creates and configures Azure Container Registry
- **Networking Module** (`tf/modules/networking/`): Sets up Virtual Network and Subnet
- **Container Apps Module** (`tf/modules/container_apps/`): Deploys the application containers

## Security Considerations

- The Container Apps are deployed with a User-Assigned Managed Identity
- The identity has only the minimum required permissions (AcrPull)
- All resources are deployed within a Virtual Network for network isolation
- No secrets are hardcoded in the configuration files
- Terraform state is secured using Azure AD/Entra ID authentication instead of storage access keys

## Troubleshooting

If you encounter permissions errors during `terraform init`:

- Check that you're logged in to the correct Azure account with `az account show`
- Verify role assignments on the storage account with `az role assignment list --scope /subscriptions/SUB_ID/resourceGroups/RG_NAME/providers/Microsoft.Storage/storageAccounts/STORAGE_ACCOUNT_NAME`
- Ensure you have the "Storage Blob Data Owner" or at minimum "Storage Blob Data Contributor" role

## Cleanup

To delete all resources created by this Terraform configuration in the current workspace:

```bash
terraform destroy
```

To clean up a specific workspace:

```bash
terraform workspace select <workspace-name>
terraform destroy
``` 
