# Technical Context

## Technology Stack

### Frontend
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Map Visualization**: Leaflet.js
- **HTTP Client**: Axios
- **Styling**: Tailwind CSS (Note: Verify if actually used or if standard CSS/component-specific CSS is the primary method)
- **State Management**: React Hooks (useState, useContext)
- **Production Web Server**: Nginx (within frontend container, serves static files and CSP header)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js with TypeScript
- **API Documentation**: Swagger/OpenAPI
- **Scheduled Tasks**: Node-cron
- **Data Processing**: JavaScript/TypeScript utility libraries
- **Security**: Dynamic CORS policy based on `NODE_ENV` and `FRONTEND_ORIGIN_PROD` environment variable.

### Database
- **Primary Options**: PostgreSQL or SQLite (Not currently implemented)
- **ORM Possibilities**: Prisma

### External APIs
- **Property Prices**: Statistics Finland API
- **Environmental Data**: HSY WMS (Helsinki Region)
- **Geographic Data**: OpenStreetMap's Overpass API
- **Transport Data**: Digitransit API

### Deployment Infrastructure (Implemented via Terraform `tf/`)
- **Containerization**: Docker
- **Cloud Platform**: Azure
- **Compute**: Azure Container Apps (ACA)
  - Backend container app receives `FRONTEND_ORIGIN_PROD` env var for CORS.
- **Registry**: Azure Container Registry (ACR)
- **Networking**: Azure Virtual Network (VNet) and Subnet
- **Monitoring**: Azure Log Analytics Workspace
- **Identity**: Azure User Assigned Managed Identity (for ACA -> ACR access)
- **Infrastructure as Code**: Terraform
- **Provider Version**: AzureRM Provider v3.x/v4.x (requires explicit `subscription_id` and `tenant_id` passed via root module variables)
- **State Storage**: Azure Blob Storage (with Azure AD Auth)
- **Custom Domain Setup (ACA)**: Azure DNS for TXT (validation) and CNAME records, Azure-managed certificates for the Container App custom domain. Implemented in `container_apps` module.
- **CI/CD**: GitHub Actions or Azure DevOps (Planned)

## Development Setup

### Local Environment Requirements
- **Primary Method**: Docker Compose
- Docker and Docker Compose
- Git for version control
- Code editor supporting Docker Compose (VS Code recommended)
- API keys for external services (managed via `.env` locally)
- Terraform CLI
- Requires `azure_subscription_id` and `azure_tenant_id` to be set (e.g., via `tf/terraform.tfvars`) for AzureRM provider authentication.
- Azure CLI (for `az login`, ACR authentication, and obtaining auth IDs)

### Containerized Development (Docker Compose)
- **Multi-Service Architecture**: `docker-compose.yml` at project root orchestrates frontend and backend services.
- **Container Builds**: Uses multi-stage Dockerfiles (`client/Dockerfile`, `server/Dockerfile`) with `development` and `production` targets.
- **Development Target**: Includes dev dependencies and runs Vite dev server.
- **Host-Container Communication**: Vite dev server uses `--host` flag.
- **Port Mapping**:
  - Frontend (Dev): `3000:5173`
  - Backend (Dev): `3001:3001`
- **API Proxy Configuration (Dev Only)**: Vite dev server proxies `/api` using `VITE_API_PROXY_TARGET`.
- **Volume Management**: Named volumes for `node_modules`, host mounts for code changes.
- **Hot Reloading**: For frontend and backend during development.

### Production Container Setup (Deployed to ACA)
- **Frontend**: Nginx serves static build output (`/app/dist`) and proxies `/api` requests.
  - Uses `client/nginx.conf` template and `client/entrypoint.sh` with `envsubst` to set backend URL via `BACKEND_URL` env var.
  - Proxies over HTTPS to backend's internal ACA FQDN on port 443.
  - Serves Content Security Policy (CSP) HTTP header via Nginx configuration.
  - Serves `X-Content-Type-Options` header via Nginx configuration.
- **Backend**: Runs compiled Node.js app (`dist/index.js`).
  - `FRONTEND_ORIGIN_PROD` environment variable configured by Terraform for CORS policy.

### Project Structure
- `/client` - Frontend React application
  - `Dockerfile` - Multi-stage, includes Nginx for production
  - `nginx.conf` - Nginx config template for proxying and security headers (CSP, X-Content-Type-Options)
  - `entrypoint.sh` - Processes Nginx template
  - `vite.config.ts` - Vite config (proxy used in dev only)
  - `/src/utils/stringUtils.ts` - Client-side string utility functions (e.g., `escapeHTML`).
- `/server` - Backend Node.js/Express API
  - `Dockerfile` - Multi-stage build
- `/plans` - Project documentation and planning
- `/memory-bank` - Cursor.ai assistant memory
- `/scripts` - Utility scripts (`acr_upload.sh`)
- `/tf` - Terraform configuration
  - `/modules` - Reusable Terraform modules
- `docker-compose.yml` - Local development orchestration
- `README.md` - Project documentation

### API Keys Management
- Development: Local .env files (not committed to git)
- Production: Secure environment variables in Azure (planned, via Key Vault integration)

### Build & Development Tools
- TypeScript compiler
- ESLint for code quality
- Prettier for code formatting
- Vite for frontend building
- `@types/node` (dev dependency in client for `vite.config.ts`)

## Technical Constraints

### Performance Considerations
- Efficient rendering of map layers with large datasets
- Optimized API responses with appropriate caching
- Minimize network requests for map interactions

### Security Requirements
- API keys and credentials protection
- Data validation for all user inputs
- Secure handling of any sensitive information
- Secure Terraform state access (using Azure AD)
- Network isolation via VNet
- HTTPS-only communication between frontend proxy and backend in ACA.
- **Cross-Origin Resource Sharing (CORS)**: Backend policy dynamically configured to allow specific frontend origins (development and production based on environment variables set by Terraform).
- **Cross-Site Scripting (XSS) Prevention**: HTML escaping applied to dynamic content rendered outside React's default JSX escaping, particularly for third-party library integrations like Leaflet tooltips and legends.
- **Content Security Policy (CSP)**: Implemented with different policies for development (via meta tag, more permissive for Vite HMR/dev server) and production (via Nginx HTTP header, stricter).
- **X-Content-Type-Options**: Set to `nosniff` via Nginx header in production to prevent browsers from MIME-sniffing responses away from the declared content-type.

### Accessibility Standards
- WCAG 2.1 AA compliance for web interface
- Keyboard navigation support
- Screen reader compatibility

## Testing Approach

- **Frontend**: React Testing Library, Vitest with happy-dom
- **Backend**: Jest, Supertest
- **Infrastructure**: (To be developed - potentially Terratest or integration tests)
- **Security**: Manual testing of CORS policy, CSP violations (browser console), and XSS fixes. Automated checks for dependency vulnerabilities (e.g., `npm audit`) should be part of CI/CD.
- **Methodology**: Test-driven development (TDD)
- **Coverage**: Essential components and critical paths
- **CI Integration**: Tests automated via GitHub Actions for both frontend and backend
- **Setup**: 
  - Frontend tests configured with Vitest using `client/vitest.config.ts`
  - Test setup in `client/src/test/setup.ts` for frontend includes jest-dom matchers
  - Component tests using proper mocking for third-party libraries (Leaflet, react-leaflet)

## Technical Dependencies

### Critical Libraries
- React and React DOM
- Express.js
- Map visualization library (Leaflet)
- GeoJSON processing utilities
- Database client libraries (if DB implemented)
- `cors` (Express middleware for CORS handling)

### Build & Development Tools
- TypeScript compiler
- ESLint for code quality
- Prettier for code formatting
- Vite for frontend building
- Docker / Docker Compose
- Terraform
- Azure CLI
- Nginx (in frontend production container)
- gettext (in frontend production container for envsubst)
