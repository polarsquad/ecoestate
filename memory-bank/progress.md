# Project Progress

## ✅ What Works

### Backend
- Basic API infrastructure with Node.js and Express
- Property price data endpoints from Statistics Finland API
- Environmental data endpoints (green spaces, public transport)
- Postcode area boundary data integration
- Scheduled tasks for data updates and caching
- **Security**: Dynamic CORS policy based on `NODE_ENV` and `FRONTEND_ORIGIN_PROD` (set via Terraform).
- **Code Quality**: Addressed linting errors and warnings (cognitive complexity, security) in the client-side `PostcodeBoundaries.tsx` component.
- **Code Quality**: Resolved all ESLint errors and major warnings in the `server/` directory. Cognitive complexity warnings were addressed through refactoring, while security/type errors were fixed or suppressed where appropriate.

### Frontend
- React application structure with TypeScript
- Map visualization integration (Leaflet.js)
- Property price heatmap visualization
- Year selection for viewing historical price data
- Toggle functionality for different visualization types
- Environmental data layer rendering
- Layer visibility toggling UI components
- **Security**:
    - XSS vulnerabilities in Leaflet tooltips and dynamic HTML in `Legend` component addressed via HTML escaping.
    - Content Security Policy (CSP) implemented via `<meta>` tag for development contexts.

### Development Environment
- **✅ Complete Docker Compose setup for local development:**
  - Multi-service orchestration for frontend, backend (and optionally database)
  - Named volumes for dependency management
  - Environment variable configuration
  - Cross-container networking and communication
  - Hot reloading and development-optimized containers

### Deployment Infrastructure (`tf/`)
- **✅ Terraform configuration implemented for Azure infrastructure:**
  - Resource Group definition
  - Azure Container Registry (ACR) module
  - Networking module (VNet, Subnet)
  - Container Apps module (Environment, Log Analytics, Apps for frontend/backend, Managed Identity)
  - Terraform Backend configured for Azure Blob Storage with Azure AD authentication
  - Terraform Workspaces enabled for environment separation (dev, staging, prod)
  - Dynamic image versioning via `app_version` variable
  - Container App image tag changes ignored via lifecycle configuration
  - Decoupled infrastructure changes from application deployment
- **✅ Frontend Nginx proxy configured for backend communication in ACA.**
- **✅ Verified application connectivity in Azure Container Apps.**
- **Security**:
    - Terraform module for Container Apps automatically configures `FRONTEND_ORIGIN_PROD` env var for backend CORS policy.
    - Nginx configuration (`client/nginx.conf`) includes production Content Security Policy (CSP) HTTP header.
    - Nginx configuration (`client/nginx.conf`) includes `X-Content-Type-Options: nosniff` header.

### Deployment Tooling (`scripts/`)
- **✅ ACR Upload Script (`scripts/acr_upload.sh`):**
  - Builds frontend & backend images for `linux/amd64`
  - Tags images with Semantic Versioning (`-v` flag)
  - Pushes images to the correct ACR based on Terraform workspace (`-w` flag)
  - Authenticates to ACR using Azure CLI (`az acr login`)
- **✅ Application Deployment Scripts:**
  - `scripts/update_container_app_image.sh`: Updates a single Container App's image using Azure CLI
  - `scripts/deploy_app.sh`: Updates both frontend and backend images to a specified version
  - Enables application updates without requiring infrastructure changes

## 🔄 In Progress

- CI/CD Pipeline Planning & Implementation
- Thorough testing of Content Security Policy in all environments.

## ⬜ What's Left to Build

### CI/CD Pipeline
- GitHub Actions or Azure DevOps pipeline definition
- Automated build stage
- Automated test stage (including CSP verification if possible)
- Automated image push stage (using `acr_upload.sh`)
- Automated deployment stage (using Terraform)
- Secure handling of secrets (e.g., integration with Azure Key Vault)

### Analysis Features
- Correlation logic between property prices and environmental factors
- Detailed location-specific insights and pop-ups
- Statistical analysis visualizations

### Documentation & Testing
- User documentation and guidelines
- Code documentation (backend, frontend, Terraform)
- Comprehensive testing (API, frontend, performance, infrastructure, CSP)
- Deployment verification and testing procedures

## 📊 Current Status

The project has successfully completed Phase 3 and the infrastructure setup (Phase 4a) is now complete and verified. Containerization, Azure infrastructure definition via Terraform (including secure state and environment management), the image upload script, and initial security hardening (XSS, CORS, CSP) are all functional. Frontend-to-backend communication within the deployed Azure Container Apps environment has been successfully established and verified.

The immediate next steps are planning and implementing the CI/CD pipeline (Phase 4b) and thoroughly testing the new security policies.

### Completed Phases
- ✅ Phase 1: Initial Project Setup & Data Exploration
- ✅ Phase 2: Data Integration and Backend Development
- ✅ Phase 3: Frontend Development & Interactive Map Visualization

### Current Phase
- 🔄 Phase 4: Deployment and Testing
  - ✅ Containerization with Docker fully implemented
  - ✅ Docker Compose setup implemented and functional
  - ✅ Azure Infrastructure defined with Terraform (`tf/`) and deployed.
  - ✅ ACR Image Upload Script created (`scripts/acr_upload.sh`).
  - ✅ Application connectivity verified in Azure.
  - ✅ Custom Domain configuration via Terraform is implemented.
  - ✅ **Initial Security Hardening Completed**:
    - XSS vulnerability fixes applied.
    - Dynamic and secure CORS policy implemented for backend & Terraform.
    - Content Security Policy (CSP) implemented for dev and prod.
    - `X-Content-Type-Options: nosniff` header implemented for prod.
  - 🔄 Planning CI/CD pipeline with GitHub Actions or Azure DevOps.
  - 🔄 Thorough testing of Content Security Policy.

### Upcoming Phases
- ⬜ Phase 5: Refinement & Documentation

## 🔍 Known Issues

- Need to integrate secrets management (e.g., Azure Key Vault) into Terraform and CI/CD.
- Need to define scaling rules for Container Apps in Terraform.
- Comprehensive testing strategy for deployed application still needs development.

## 📝 Evolution of Project Decisions

- Initially considered simpler visualization library but opted for more powerful Leaflet.js for better control
- Decided on toggleable layers approach for better user experience versus showing all data simultaneously
- Chose to implement both snapshot and trend visualizations for more comprehensive insights
- Selected Docker and Azure Container Apps for deployment to ensure scalability and maintainability
- Decided to use Terraform for infrastructure management to ensure reproducible environments
- Enhanced development workflow with containerized local development
- Implemented multi-stage Docker builds for optimized production images
- **Implemented Docker Compose for local multi-service development workflow**
- **Refined containerization approach with named volumes to preserve node_modules and prevent conflicts**
- **Configured dynamic environment variables for different runtime contexts (local vs. containerized)**
- **Adopted Terraform workspaces for environment management**
- **Configured Terraform backend with Azure AD authentication**
- **Standardized Docker image tagging using Semantic Versioning**
- **Created a script for building and pushing versioned images to environment-specific ACRs**
- **Resolved Terraform deployment issues (subnet delegation, state permissions, image architecture, cyclical dependencies in module configurations)**
- **Implemented Nginx reverse proxy in frontend container to handle ACA internal communication.**
- **Updated Terraform AzureRM Provider authentication to use explicit `subscription_id` and `tenant_id` variables due to provider version changes (v3.x/v4.x).**
- **Implemented custom domain setup for Azure Container Apps with managed certificates and Azure DNS via Terraform.**
- **Implemented XSS mitigation strategies** using HTML escaping for dynamic content in frontend components.
- **Enhanced CORS policy** for the backend to be dynamic and secure, configured via environment variables set by Terraform.
- **Introduced Security Headers**:
    - Content Security Policy (CSP) with different configurations for development (meta tag) and production (Nginx header) to bolster application security.
    - `X-Content-Type-Options: nosniff` added via Nginx to prevent MIME sniffing.
- **Separated Infrastructure from Application Deployment**:
    - Modified Terraform to ignore image tag changes in Container Apps
    - Made app_version variable optional with sensible defaults
    - Created simplified Azure CLI scripts for container image updates
    - Established clear separation of concerns between infrastructure management and application releases
