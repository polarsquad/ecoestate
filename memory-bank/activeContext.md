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
  - ✅ **Custom Domain Setup for Frontend Container App (using Azure DNS & Managed Certificate)**
    - Terraform configuration added to `container_apps` module for `azurerm_container_app_custom_domain`, `azurerm_dns_txt_record` (validation), and `azurerm_dns_cname_record`.
  - ✅ **Security Hardening Implemented**:
    - Addressed XSS vulnerabilities in frontend tooltips and dynamic HTML rendering.
    - Implemented dynamic CORS policy for backend, configurable for production via environment variables and automatically set via Terraform.
    - Added Content Security Policy (CSP) for both development (meta tag) and production (Nginx header).
    - Added `X-Content-Type-Options: nosniff` header via Nginx.
  - 🔄 Planning and breaking down CI/CD pipeline implementation:
    - Step 1: Set up a basic GitHub Actions workflow to run static analysis (ESLint for TypeScript, Trivy for Terraform).
    - Step 2: Extend the workflow to run backend and frontend tests (Jest, React Testing Library).
    - Step 3: (Future) Add build, Docker image push, deployment, and secrets management steps.

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
- ✅ **Troubleshooted and fixed frontend-to-backend communication within Azure Container Apps.**
- ✅ **Updated Terraform AzureRM Provider authentication**: Switched from implicit/`use_cli` attempts to explicit `subscription_id` and `tenant_id` configuration via root module variables (`azure_subscription_id`, `azure_tenant_id` in `tf/variables.tf` and `README.md` updated).
- ✅ **Initiated Custom Domain Setup for Frontend Container App**:
    - Added `azurerm_container_app_custom_domain` to `container_apps` module.
    - Added `azurerm_dns_txt_record` for validation and `azurerm_dns_cname_record` for pointing the custom hostname (all within Azure DNS, managed by Terraform).
    - Configured for Azure-managed SSL certificate (`certificate_binding_type = "SniEnabled"`).
    - Added `lifecycle { ignore_changes = ["certificate_binding_type", "container_app_environment_certificate_id"] }` to `azurerm_container_app_custom_domain` to handle Azure-managed fields.
- ⚠️ Temporarily disabled frontend fetching/display of green spaces layer due to performance issues with large dataset (`client/src/components/PostcodeBoundaries.tsx`).
- ✅ **XSS Vulnerability Remediation**:
    - Created `escapeHTML` utility in `client/src/utils/stringUtils.ts`.
    - Applied sanitization to dynamic content in Leaflet tooltips (`PostcodeBoundaries.tsx`) and legend titles (`Legend.tsx`).
- ✅ **CORS Configuration Enhancements**:
    - Backend (`server/src/index.ts`) CORS policy now dynamically configured using `NODE_ENV` and `FRONTEND_ORIGIN_PROD` environment variable.
    - Terraform module `tf/modules/container_apps/main.tf` updated to automatically set `FRONTEND_ORIGIN_PROD` on the backend container, resolving potential cyclical dependencies by constructing default FQDNs where necessary and using a local variable for the frontend app name.
- ✅ **Content Security Policy (CSP) Implementation**:
    - Added development CSP via `<meta http-equiv="Content-Security-Policy">` in `client/index.html`.
    - Added production CSP via HTTP header in `client/nginx.conf`.
- ✅ **Security Headers Implementation**:
    - **Content Security Policy (CSP)**:
        - Development CSP added via `<meta http-equiv="Content-Security-Policy">` in `client/index.html`.
        - Production CSP added via HTTP header in `client/nginx.conf`.
    - **X-Content-Type-Options**: `nosniff` header added via Nginx configuration (`client/nginx.conf`).
- ✅ **Client-Side Linting**: Resolved cognitive complexity and security/detect-object-injection warnings in `client/src/components/PostcodeBoundaries.tsx`.
- ✅ **Server-Side Linting**: Resolved multiple ESLint errors and warnings (e.g., `no-unsafe-assignment`, `detect-object-injection`, `cognitive-complexity`) in `server/src/services/` files, primarily through code fixes and strategic use of suppression comments for accepted risks/false positives.
- ✅ **Decoupled Infrastructure from Application Deployment**:
    - Modified Terraform `container_apps` module to ignore image tag changes using `lifecycle { ignore_changes = [template[0].container[0].image] }`.
    - Made `app_version` variable optional with a default value, allowing infrastructure changes without requiring an image tag.
    - Created local value `effective_app_version` to handle null/empty app_version values.
    - Updated documentation to reflect this separation of concerns.
    - Added scripts `scripts/deploy_app.sh` and `scripts/update_container_app_image.sh` for app deployments without Terraform
- ✅ **Implemented Frontend Testing Framework**:
    - Set up Vitest as the testing framework for the React frontend
    - Added React Testing Library for component testing
    - Created test setup configuration in `client/vitest.config.ts` and `client/src/test/setup.ts`
    - Implemented unit tests for components and utilities (LayerControl, Legend, stringUtils)
    - Configured proper mocking for Leaflet and React-Leaflet dependencies
- ✅ **Enhanced CI/CD Pipeline**:
    - Extended GitHub Actions workflow to include frontend and backend test execution
    - Configured jobs to run after linting and fail the pipeline on test failures
    - Added coverage directory to .gitignore to keep test coverage reports out of version control
- ✅ **Critical Security Vulnerability Fix**:
    - **Issue**: `osmtogeojson@3.0.0-beta.5` had a critical vulnerability due to dependency on vulnerable `@xmldom/xmldom@0.8.3` (CVE-2022-39353, CVSS 9.8/10)
    - **Solution**: Replaced `osmtogeojson` with `osm2geojson-lite@1.1.1`:
        - Zero dependencies (eliminates xmldom vulnerability completely)
        - Better performance (2.5x-11x faster than osmtogeojson)
        - Active maintenance (published recently)
        - Compatible API for seamless replacement
    - **Files Updated**:
        - `server/src/services/overpassService.ts`: Changed import and function call
        - `server/src/scripts/testOverpassApi.ts`: Updated import and usage
        - `server/src/tests/services/overpassService.test.ts`: Updated mocking and test references
    - **Verification**: All tests pass, npm audit shows 0 vulnerabilities, functionality verified

## Next Steps

With the core infrastructure defined, application connectivity verified in Azure, initial security hardening in place, and test automation implemented, the next steps are:

1.  **Complete CI/CD Pipeline Development**:
    - Add build, Docker image push, deployment automation, and secrets management to the CI/CD pipeline
    - Create deployment stage with appropriate environment selection
2.  **Thoroughly Test CSP**: Verify CSP in both development and production environments, checking for console errors and ensuring all site functionality remains intact.
3.  **Start Phase 5 Work**:
    - Begin implementing correlation logic between property prices and environmental factors.
    - Develop detailed location-specific insights and pop-ups.
    - Write comprehensive user and developer documentation.
4.  **Testing and Deployment**:
    - Thoroughly test the application in deployed environments (dev, staging).
    - Deploy the initial version to production.
5.  **Planning for efficient implementation of correlation analysis features**:
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
- **Terraform Provider Authentication**: Explicit `subscription_id` and `tenant_id` via root module variables for AzureRM v3.x/v4.x.
- **Custom Domain (ACA)**: Using Azure DNS for automated TXT validation and CNAME records, with Azure-managed certificates.
- **Security - XSS Prevention**: Utilize HTML escaping for dynamic content rendered outside of React's default JSX escaping, especially with third-party libraries that use `innerHTML` or construct HTML strings.
- **Security - CORS Policy**: Backend employs a dynamic CORS policy based on `NODE_ENV` and `FRONTEND_ORIGIN_PROD` (set by Terraform in Azure), allowing specific origins rather than wildcards.
- **Security - Content Security Policy (CSP)**: Dual CSP setup: `<meta>` tag for more permissive development policy (Vite HMR), and stricter HTTP header from Nginx for production.
- **Security - X-Content-Type-Options**: `nosniff` header added via Nginx to prevent MIME sniffing.
- **Deployment Strategy**: Separated infrastructure management (Terraform) from application deployment (Azure CLI scripts) to enable independent lifecycles and simpler CI/CD:
  - Infrastructure changes made with Terraform (ignores image tag changes)
  - Application updates made with `scripts/deploy_app.sh` (without modifying infrastructure)

## Current Challenges

- Ensuring secure management of API keys and secrets in production environment (Next step: Integrate Key Vault).
- Configuring proper scaling rules for Container Apps.
- Designing effective CI/CD pipeline for reliable deployments and promotions.
- Planning for efficient implementation of correlation analysis features.
- **Verifying robustness and compatibility of the implemented Content Security Policy across all features and browsers.**
- **Content Security Policy (CSP) & Other Headers**: Requires different approaches for development (Vite's needs) and production (server-sent headers). Understanding directive interactions (e.g., `default-src` as fallback) and library-specific needs (e.g., Leaflet potentially using inline styles) is important. Ensuring headers like `X-Content-Type-Options` don't conflict with necessary functionality (assuming correct MIME types are served).
- **HTML Sanitization**: Essential when embedding dynamic data into HTML strings used by third-party libraries or `innerHTML`, even if the data originates from trusted API sources, as a defense-in-depth measure.

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
- **AzureRM Provider Upgrades**: Newer versions (v3.x onwards) have stricter authentication requirements, necessitating explicit `subscription_id` and `tenant_id` configuration if not using other auth methods like MSI/SPN env vars.
- **Azure Container App Custom Domain Lifecycle**: Correctly configuring `azurerm_container_app_custom_domain` with `lifecycle { ignore_changes = [...] }` is crucial for Azure-managed certificates to prevent Terraform from fighting Azure over auto-populated certificate details. Understanding the asynchronous nature of domain validation and certificate issuance by Azure is key.
- **Terraform ID Parsing**: Errors like `parsing segment "staticCertificates": parsing the Certificate ID: the segment at position 8 didn't match` can occur if Azure returns certificate IDs in a format slightly different from what the provider expects for specific attributes, highlighting the importance of `ignore_changes` for Azure-managed certificate IDs.
- **Terraform Cyclical Dependencies**: When configuring inter-dependent resources (like frontend FQDN for backend CORS, and backend FQDN for frontend API proxy), care must be taken to avoid direct circular references. Constructing FQDNs from known components (like app name and environment default domain) can break such cycles.
- **Content Security Policy (CSP) Implementation**: Requires different approaches for development (Vite's needs) and production (server-sent headers). Understanding directive interactions (e.g., `default-src` as fallback) and library-specific needs (e.g., Leaflet potentially using inline styles) is important.
- **HTML Sanitization**: Essential when embedding dynamic data into HTML strings used by third-party libraries or `innerHTML`, even if the data originates from trusted API sources, as a defense-in-depth measure.
- **Terraform Lifecycle Management**: Using `lifecycle { ignore_changes = [...] }` is critical for resources that might be updated outside of Terraform (like container images) or by Azure's automated processes (like certificate IDs). This prevents Terraform from attempting to revert such changes.
- **Azure CLI for Container App Updates**: The `az containerapp update --image` command provides a simpler and more direct way to update container images than manipulating JSON templates, resulting in cleaner deployment scripts.
- **Separating Infrastructure from Application Code**: By making app_version optional and ignoring image changes in Terraform, we created a clean separation between infrastructure changes (managed by Terraform) and application updates (managed by deployment scripts). This simplifies CI/CD and prevents unnecessary infrastructure updates.
