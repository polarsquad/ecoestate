# System Patterns

## System Architecture

EcoEstate follows a classic three-tier architecture:

1. **Frontend (Presentation Layer)**
   - React with TypeScript
   - Interactive map visualization using Leaflet.js
   - UI components for data layer toggling and controls
   - Axios for API communication
   - Served by Nginx (in production container, also handles CSP header)

2. **Backend (Application Layer)**
   - Node.js with Express
   - REST API endpoints serving aggregated data
   - Caching mechanisms for optimized response times
   - Scheduled tasks for data updates
   - Dynamic CORS policy management.

3. **Data Layer**
   - PostgreSQL/SQLite database for persistent storage
   - Integration with external APIs:
     - Statistics Finland API (property prices)
     - HSY WMS (environmental data)
     - OpenStreetMap (geographic data)
     - Digitransit (transport data)

4. **Infrastructure Layer (Azure via Terraform)**
   - Azure Resource Group (per environment)
   - Azure Container Registry (ACR) (per environment)
   - Azure Virtual Network & Subnet
   - Azure Log Analytics Workspace
   - Azure Container Apps Environment
   - Azure Container Apps (frontend & backend)
     - Frontend ACA includes Nginx reverse proxy
     - Backend ACA configured for internal HTTPS ingress
   - Azure User Assigned Managed Identity

## Key Design Patterns

1. **Data Flow Architecture**
   - Unidirectional data flow in the React frontend
   - State management with React hooks for UI components
   - API service modules for backend communication

2. **API Patterns**
   - RESTful API design for frontend-backend communication
   - Data aggregation and transformation on the backend
   - Standardized response formats

3. **Map Visualization**
   - Layer-based approach for different data visualizations
   - Choropleth maps for price data
   - Marker clusters for point-based environmental data
   - Interactive controls for layer toggling

4. **Data Processing**
   - Scheduled data fetching and caching for external APIs
   - Geospatial data processing for correlation analysis
   - Query optimization for large datasets

5. **Containerization Pattern (Implemented)**
   - **Multi-Stage Dockerfiles**: Production frontend image includes Nginx + static build + entrypoint script for proxy config. Backend image for compiled Node.js app.
   - **Docker Compose Orchestration**: For local development.
   - **Dependency Management**: Standard npm practices, named volumes in Compose.
   - **Live Reloading**: Via volume mounts in Compose.
   - **Dev Server Configuration**: Vite dev server configured for external connections and API proxying (via env var).
   - **Production Frontend Serving**: Nginx serves static files, proxies `/api` requests, and adds security headers (CSP, X-Content-Type-Options).
   - **Container Communication**: Docker Compose uses service names; ACA uses internal DNS.
   - **Environment Isolation**: Via Docker Compose env vars and Terraform variables/workspaces.
   - **Backend Environment**: Includes `PORT` and `FRONTEND_ORIGIN_PROD` (for CORS) environment variables, set by Terraform in ACA.

6. **Infrastructure as Code (IaC) Pattern (Implemented)**
   - **Tooling**: Terraform.
   - **Modularity**: Modules for `acr`, `networking`, `container_apps`.
   - **Environment Management**: Terraform workspaces (dev, staging, prod).
   - **State Management**: Remote Azure Blob Storage backend with Azure AD auth.
   - **Dynamic Configuration**: `app_version` variable in Terraform for image versions (optional for infrastructure-only changes).
   - **Provider Authentication**: AzureRM provider configured to use explicit `subscription_id` and `tenant_id` passed as root module variables (e.g., via `terraform.tfvars`). This became necessary after provider upgrades (v3.x/v4.x).
   - **Resource Change Isolation**: Uses `lifecycle { ignore_changes = [...] }` for properties managed outside of Terraform (e.g., container image tags updated by deployment scripts).

7. **Reverse Proxy Pattern (ACA)**
   - **Location**: Nginx running inside the frontend container app.
   - **Purpose**: Route incoming browser requests for `/api/*` to the internal backend container app. Serve static content and security headers.
   - **Mechanism**: `proxy_pass` directive in `nginx.conf` uses an environment variable (`BACKEND_URL`) containing the backend's internal ACA FQDN. Uses HTTPS on port 443.
   - **Configuration**: Nginx config template (`nginx.conf`) is processed by an `entrypoint.sh` script using `envsubst` to inject the backend URL at container startup. Also includes `add_header Content-Security-Policy ...;` and `add_header X-Content-Type-Options ...;`.
   - **Security**: Proxies to the backend's internal HTTPS endpoint; Terraform ensures backend only allows HTTPS ingress. Serves production security headers (CSP, X-Content-Type-Options).

8. **Custom Domain and Certificate Management (ACA) (Implemented & In Progress)**
   - **Goal**: Assign a user-friendly custom domain to the frontend Azure Container App.
   - **Method**: Using `azurerm_container_app_custom_domain` resource in Terraform.
   - **DNS Configuration (if Azure DNS is used)**:
     - `azurerm_dns_txt_record`: Automatically created by Terraform for domain ownership validation (`asuid.{subdomain}` pointing to the Container App's `custom_domain_verification_id`).
     - `azurerm_dns_cname_record`: Automatically created by Terraform to point the custom hostname (e.g., `www.yourdomain.com`) to the Container App's default FQDN. (Note: Apex domain CNAMEs are generally avoided; ALIAS records would be an alternative if needed for apex).
   - **Certificate**: Azure-managed SSL certificate.
     - `certificate_binding_type` set to `SniEnabled`.
     - `container_app_environment_certificate_id` is not explicitly set in Terraform, allowing Azure to manage it.
   - **Terraform `lifecycle` block**: `ignore_changes` for `certificate_binding_type` and `container_app_environment_certificate_id` on the `azurerm_container_app_custom_domain` resource to prevent issues with Azure auto-populating these fields for managed certificates.
   - **Troubleshooting**:
     - "No binding" status in Azure portal: Often due to pending domain validation or issues with the `lifecycle` block.
     - "Connection reset by peer" (TLS handshake): Typically related to SNI mismatch or certificate not fully provisioned/bound for the custom domain.
     - Terraform errors on `managedCertificates` vs `certificates` path: Indicates issues with how the provider parses Azure-managed certificate IDs, underscoring the importance of `ignore_changes`.

9. **XSS Prevention Pattern (Implemented)**
    - **Primary Defense**: React's inherent JSX escaping for content rendered directly by React components.
    - **Secondary Defense**: Custom `escapeHTML` utility function (`client/src/utils/stringUtils.ts`) applied to dynamic data before it is embedded into HTML strings used by third-party libraries (e.g., Leaflet tooltips) or set via `innerHTML` (e.g., `Legend.tsx` component title).
    - **Goal**: Prevent injection of malicious scripts through data originating from APIs or other dynamic sources when direct HTML manipulation is necessary.

10. **CORS Management Pattern (Implemented)**
    - **Location**: Backend Express application (`server/src/index.ts`).
    - **Mechanism**: Uses the `cors` middleware with a dynamic origin function.
    - **Policy**: 
        - In development (`NODE_ENV=development`): Allows `http://localhost:5173` (Vite dev server) and optionally `FRONTEND_ORIGIN_PROD` (if set, for testing dev backend with deployed frontend).
        - In production (`NODE_ENV=production` or other): Allows only the origin specified in the `FRONTEND_ORIGIN_PROD` environment variable.
        - Logs errors if `FRONTEND_ORIGIN_PROD` is not set in production.
    - **Terraform Integration**: The `FRONTEND_ORIGIN_PROD` environment variable for the backend Azure Container App is automatically set by the Terraform module (`tf/modules/container_apps/main.tf`), deriving its value from the frontend's custom hostname or default FQDN.
    - **Goal**: Restrict API access to known frontend origins, enhancing security.

11. **Content Security Policy (CSP) Pattern (Implemented)**
    - **Dual Policy Approach**: To accommodate different needs for development and production.
    - **Development CSP**:
        - **Mechanism**: `<meta http-equiv="Content-Security-Policy">` tag in `client/index.html`.
        - **Permissiveness**: More permissive to support Vite dev server features (e.g., `script-src 'unsafe-inline' 'unsafe-eval'`, `style-src 'unsafe-inline'`, `connect-src ws://localhost:5173`).
    - **Production CSP**:
        - **Mechanism**: `Content-Security-Policy` HTTP header set by Nginx in `client/nginx.conf` (overrides meta tag).
        - **Permissiveness**: Stricter (e.g., `script-src 'self'`, no `unsafe-eval`). `style-src 'unsafe-inline'` retained for potential Leaflet compatibility.
    - **Directives Include**: `default-src`, `script-src`, `style-src`, `img-src` (allowing OpenStreetMap tiles), `font-src`, `connect-src`, `worker-src`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`.
    - **Goal**: Mitigate XSS and other injection attacks by restricting the sources from which resources can be loaded and executed.

12. **MIME Sniffing Prevention Pattern (Implemented)**
    - **Mechanism**: `X-Content-Type-Options: nosniff` HTTP header set by Nginx in `client/nginx.conf`.
    - **Goal**: Prevent browsers from interpreting files as a different MIME type than what is specified by the `Content-Type` header, mitigating attacks related to content-type confusion.

13. **Application Deployment Pattern (Implemented)**
    - **Separation of Concerns**: Clear distinction between infrastructure management (Terraform) and application deployment (Azure CLI scripts).
    - **Infrastructure Changes**: Managed via Terraform with image tag changes ignored.
    - **Application Updates**: Managed via Azure CLI scripts without touching infrastructure.
    - **Tooling**:
        - `scripts/update_container_app_image.sh`: Uses `az containerapp update --image` to update a single container app's image.
        - `scripts/deploy_app.sh`: Wrapper script to update both frontend and backend apps to the same version.
    - **Benefits**:
        - Simplified CI/CD pipelines (can update app without Terraform apply)
        - Reduced risk of unintended infrastructure changes during application deployments
        - Faster application deployments (no need to evaluate infrastructure changes)
    - **Usage**: After initial deployment with Terraform, application updates use `./scripts/deploy_app.sh -g <resource-group> -p <project-name> -e <environment> -v <version> -r <registry-url>`.

14. **CI/CD Pipeline Pattern (Implemented, Step 2 Completed)**
    - **Tooling**: GitHub Actions
    - **Step 1 (Completed)**: Static Analysis
        - ESLint on all TypeScript code (frontend and backend).
        - Trivy on all Terraform code in `tf/`.
        - Pipeline fails if either linter or Trivy finds errors.
    - **Step 2 (Completed)**: Test Execution
        - Backend tests using Jest/Supertest.
        - Frontend tests using Vitest/React Testing Library.
        - Pipeline fails on any test failures.
        - Tests run after successful linting.
    - **Step 3 (Planned)**: Build & Deploy
        - Build Docker images for frontend and backend.
        - Push images to Azure Container Registry using `scripts/acr_upload.sh`.
        - Deploy updated images to Azure Container Apps using `scripts/deploy_app.sh`.
    - **Step 4 (Planned)**: Secrets Management
        - Integrate Azure Key Vault for secure secrets handling in CI/CD.
    - **Step 5 (Planned)**: Additional Enhancements
        - Add environment matrix for dev/staging/prod.
    - **Benefits**:
        - Ensures code quality and security before build/deploy.
        - Automates testing and deployment for faster, more reliable releases.
        - Supports separation of concerns between infrastructure and application code.

15. **Frontend Testing Pattern (Implemented)**
    - **Framework**: Vitest (compatible with Vite build system)
    - **Environment**: happy-dom (lightweight, JSDOM alternative)
    - **Component Testing**: React Testing Library
    - **Assertions**: Jest-DOM (via `@testing-library/jest-dom`)  
    - **Directory Structure**:
        - Test files located alongside the code they test in `__tests__` directories
        - Common setup in `client/src/test/setup.ts`
    - **Configuration**: `client/vitest.config.ts` with React plugin
    - **Test Running**: Via `npm test` script
    - **CI Integration**: Automated via GitHub Actions workflow
    - **Test Coverage**: Core utility functions and UI components
    - **Mocking Strategy**: 
        - Direct module mocks using `vi.mock()`
        - Vi spy/mock functions with `vi.fn()`
        - Strategic DOM mocking for third-party libraries like Leaflet
    - **Benefits**:
        - Fast execution with Vite-powered test runner
        - Native TypeScript support
        - Compatible with existing React Testing Library knowledge
        - Ensures components render and behave correctly

## Critical Implementation Paths

1. **Data Integration Flow**
   - External API → Backend Caching → Database Storage → API Endpoints → Frontend Visualization

2. **User Interaction Flow**
   - UI Controls → State Updates → Data Requests → Map Rendering → Information Display

3. **Correlation Analysis Flow**
   - Data Selection → Geospatial Joining → Statistical Analysis → Visualization → User Insights

4. **Containerized Development Flow**
   - Code Changes → Hot Reload in Container → Live Updates in Browser → Immediate Feedback Loop

5. **Deployment Flow (Manual/Planned CI/CD)**
   - **Initial Infrastructure**: Code Change → Terraform Apply (may include initial app_version) → Azure Infrastructure Provisioned
   - **Application Updates**: Code Change → Build, Tag & Push image to ACR (`scripts/acr_upload.sh -v <ver> -w <env>`) → Update Container Apps (`scripts/deploy_app.sh -g <rg> -p <proj> -e <env> -v <ver> -r <registry>`) → Test

## Component Relationships

- **Map Component**: Core visualization container
  - **Layer Control**: Manages visibility of data layers
  - **Legend Component**: Explains visualization colors/symbols
  - **Info Panel**: Displays detailed information for selected areas

- **Data Service Layer**: Backend abstraction for data sources
  - **Caching Service**: Optimizes API response times
  - **Aggregation Service**: Processes and combines datasets
  - **Correlation Service**: Analyzes relationships between data points

- **Infrastructure Components (Terraform)**
  - **Root Module (`tf/`)**: Orchestrates modules and defines providers/backend.
  - **ACR Module**: Manages Azure Container Registry resource.
  - **Networking Module**: Manages VNet and Subnet.
  - **Container Apps Module**: Manages Log Analytics, ACA Environment, ACA Apps (frontend/backend), Managed Identity, Role Assignment.
