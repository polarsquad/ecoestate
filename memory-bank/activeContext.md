# Active Context

## Current Work Focus

Based on the implementation plan, the project is currently in the following state:

- **Phase 1 (Initial Setup & Data Exploration)**: ✅ COMPLETE
  - Git repository and basic folder structure established
  - React frontend initialized
  - Backend API (Node.js + Express + TypeScript) set up
  - API keys registered and obtained
  - API data availability and quality verified

- **Phase 2 (Data Integration and Backend Development)**: ✅ COMPLETE
  - Backend endpoints created for property prices, green-space data, and postcode boundaries
  - Automated scheduled tasks implemented for data updates

- **Phase 3 (Frontend Development & Map Visualization)**: ✅ COMPLETE
  - React mapping library integrated
  - Environmental data layers implemented
  - UI components for layer toggling implemented
  - Property price data visualization implemented:
    - ✅ Year-specific price heatmap visualization
    - ✅ Year selection functionality
    - ✅ Toggle between different visualizations
    - ✅ Price trend visualization

- **Phase 4 (Deployment and Testing)**: 🔄 IN PROGRESS
  - ✅ Containerization implemented (Dockerfiles, Docker Compose).
  - ✅ Azure infrastructure setup with Terraform implemented (`tf/`):
    - Defined resources for Resource Group, ACR, VNet, Container Apps Environment, Log Analytics, Managed Identity.
    - Configured Terraform backend with Azure AD/Entra ID authentication.
    - Implemented Terraform workspaces for environment management.
    - Aligned Container Apps deployment to use specific image versions.
    - Configured Container Apps ingress for secure internal communication (HTTPS).
  - ✅ Script for uploading images to ACR created (`scripts/acr_upload.sh`):
    - Builds production images for `linux/amd64`.
    - Tags images using Semantic Versioning.
    - Pushes images to the correct ACR based on Terraform workspace.
    - Uses Azure CLI for ACR authentication.
  - ✅ Resolved deployment connectivity issues (frontend Nginx proxy to backend ACA).
  - 🔄 Planning CI/CD pipeline.

- **Phase 5 (Refinement & Documentation)**: ⬜ NOT STARTED
  - Correlation logic implementation needed
  - Detailed pop-ups for insights to be developed
  - Documentation to be written
  - User feedback to be collected

## Recent Changes

- ✅ Implemented Terraform configuration for Azure infrastructure.
- ✅ Made Terraform configuration compatible with Terraform workspaces.
- ✅ Configured Terraform backend to use Azure AD/Entra ID authentication.
- ✅ Created and refined `scripts/acr_upload.sh` for building, tagging (SemVer), and pushing images.
- ✅ Aligned Terraform Container Apps configuration to pull images based on a specified version variable.
- ✅ Resolved various Terraform deployment issues (subnet delegation, state permissions, image architecture).
- ✅ **Troubleshooted and fixed frontend-to-backend communication within Azure Container Apps:**
    - Implemented Nginx reverse proxy in the frontend container (`client/nginx.conf`, `client/entrypoint.sh`).
    - Configured Nginx to proxy `/api` requests securely over HTTPS to the backend's internal ACA FQDN using port 443.
    - Set necessary Nginx proxy headers (`proxy_http_version`, `proxy_ssl_server_name on`) for ACA environment.
    - Configured Terraform to pass the backend URL to the frontend container via environment variable (`BACKEND_URL`).
    - Ensured backend Container App ingress is configured for HTTPS internal transport.
- ⚠️ Temporarily disabled frontend fetching/display of green spaces layer due to performance issues with large dataset (`client/src/components/PostcodeBoundaries.tsx`).

## Next Steps

With the core infrastructure defined and application connectivity verified in Azure, the next steps are:

1.  **Develop CI/CD Pipeline**: 
    - Set up GitHub Actions or Azure DevOps pipeline.
    - Configure build, test, image push (using `acr_upload.sh`), and deployment (using Terraform) stages.
    - Implement automated testing before deployment.
    - Securely manage secrets (e.g., using Azure Key Vault, referenced in Terraform/pipeline).

2.  **Start Phase 5 Work**: 
    - Begin implementing correlation logic between property prices and environmental factors.
    - Develop detailed location-specific insights and pop-ups.
    - Write comprehensive user and developer documentation.

3.  **Testing and Deployment**: 
    - Thoroughly test the application in deployed environments (dev, staging).
    - Deploy the initial version to production.

4.  **Planning for efficient implementation of correlation analysis features**:
    - **Investigate performance improvements for loading/displaying the green spaces layer** (e.g., backend simplification, alternative data sources, frontend optimization).

## Active Decisions

- **Map Library**: Using Leaflet.js
- **Visualization Approach**: Heatmap for prices, toggleable layers for environmental data
- **Deployment Strategy**: Containerized approach with Azure Container Apps
- **Infrastructure Management**: Terraform for IaC
- **Container Strategy**: Multi-stage builds, Docker Compose for local dev, non-root users, `.dockerignore`
- **State Management**: Terraform state stored in Azure Blob Storage with Azure AD/Entra ID authentication.
- **Image Tagging**: Semantic Versioning 2.0.0 for Docker images.
- **Internal Communication**: Frontend Nginx proxies `/api` requests to backend over HTTPS using ACA internal DNS and port 443.

## Current Challenges

- Ensuring secure management of API keys and secrets in production environment (Next step: Integrate Key Vault).
- Configuring proper scaling rules for Container Apps.
- Designing effective CI/CD pipeline for reliable deployments and promotions.
- Planning for efficient implementation of correlation analysis features.

## User Feedback Insights

- Not yet collected.

## Implementation Learnings

- Geospatial data visualization requires careful optimization.
- Property price data from Statistics Finland requires preprocessing.
- Environmental data layers should be togglable.
- Containerization requires careful consideration of build optimizations, dependencies, port mappings, dev server configs, and volume management.
- Docker Compose effectively orchestrates multi-service local development.
- Environment variables are crucial for containerized vs. local differences.
- Vite config needs care for containerization and proxying (but proxying is handled by Nginx in production).
- Terraform backend authentication with Azure AD requires specific RBAC roles (`Storage Blob Data Owner`) at the storage account level.
- Azure Container Apps require `linux/amd64` images.
- Explicit subnet delegation in Terraform can conflict with implicit delegation by Container Apps Environment resource; removed explicit delegation.
- **Proxying between containers in ACA requires careful Nginx/proxy configuration:**
    - Explicitly use HTTPS and port 443 for secure internal ingress.
    - Set `proxy_http_version 1.1`, and `proxy_ssl_server_name on` in Nginx for HTTPS proxying.
    - Pass backend URL via environment variable.
- **Large datasets from APIs (like Overpass for green spaces) can cause significant frontend performance issues.** Need strategies for data simplification or optimization before displaying on the map.
