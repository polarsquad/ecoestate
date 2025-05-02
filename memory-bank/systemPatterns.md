# System Patterns

## System Architecture

EcoEstate follows a classic three-tier architecture:

1. **Frontend (Presentation Layer)**
   - React with TypeScript
   - Interactive map visualization using Leaflet.js
   - UI components for data layer toggling and controls
   - Axios for API communication
   - Served by Nginx (in production container)

2. **Backend (Application Layer)**
   - Node.js with Express
   - REST API endpoints serving aggregated data
   - Caching mechanisms for optimized response times
   - Scheduled tasks for data updates

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
   - **Multi-Stage Dockerfiles**: Production frontend image includes Nginx + static build + entrypoint script for proxy config.
   - **Docker Compose Orchestration**: For local development.
   - **Dependency Management**: Standard npm practices, named volumes in Compose.
   - **Live Reloading**: Via volume mounts in Compose.
   - **Dev Server Configuration**: Vite dev server configured for external connections and API proxying (via env var).
   - **Production Frontend Serving**: Nginx serves static files and proxies `/api` requests.
   - **Container Communication**: Docker Compose uses service names; ACA uses internal DNS.
   - **Environment Isolation**: Via Docker Compose env vars and Terraform variables/workspaces.

6. **Infrastructure as Code (IaC) Pattern (Implemented)**
   - **Tooling**: Terraform.
   - **Modularity**: Modules for `acr`, `networking`, `container_apps`.
   - **Environment Management**: Terraform workspaces (dev, staging, prod).
   - **State Management**: Remote Azure Blob Storage backend with Azure AD auth.
   - **Dynamic Configuration**: `app_version` variable in Terraform.

7. **Reverse Proxy Pattern (ACA)**
   - **Location**: Nginx running inside the frontend container app.
   - **Purpose**: Route incoming browser requests for `/api/*` to the internal backend container app.
   - **Mechanism**: `proxy_pass` directive in `nginx.conf` uses an environment variable (`BACKEND_URL`) containing the backend's internal ACA FQDN. Uses HTTPS on port 443.
   - **Configuration**: Nginx config template (`nginx.conf`) is processed by an `entrypoint.sh` script using `envsubst` to inject the backend URL at container startup.
   - **Security**: Proxies to the backend's internal HTTPS endpoint; Terraform ensures backend only allows HTTPS ingress.

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
   - Code Change → Build Images (`docker build --platform linux/amd64`) → Tag Image (SemVer) → Push to Dev ACR (`scripts/acr_upload.sh -v <ver> -w dev`) → Deploy to Dev Env (`terraform apply -var app_version=<ver>`) → Test → Push to Staging ACR (`scripts/acr_upload.sh -v <ver> -w staging`) → Deploy to Staging Env → Test → Push to Prod ACR → Deploy to Prod Env

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
