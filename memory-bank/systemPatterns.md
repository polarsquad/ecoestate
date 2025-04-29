# System Patterns

## System Architecture

EcoEstate follows a classic three-tier architecture:

1. **Frontend (Presentation Layer)**
   - React with TypeScript
   - Interactive map visualization using Leaflet or Mapbox GL JS
   - UI components for data layer toggling and controls
   - Axios for API communication

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
   - **Multi-Stage Dockerfiles**: Both `client/Dockerfile` and `server/Dockerfile` use multi-stage builds with distinct `development` and `production` targets.
   - **Docker Compose Orchestration**: `docker-compose.yml` manages the `frontend` and `backend` services for local development, using the `development` stage from the Dockerfiles.
   - **Dependency Management**: `npm install` is run within the `development` stage image build. Named volumes (`frontend_node_modules`, `backend_node_modules`) are used in Compose to persist `node_modules` during runtime and prevent conflicts with local directories.
   - **Live Reloading**: Volume mounts (`./client:/app`, `./server:/app`) enable live code reloading within the containers.
   - **Dev Server Configuration**: Frontend dev server (Vite) is configured with `--host` to accept connections mapped from the host.
   - **API Proxy**: Vite's proxy is configured dynamically using the `VITE_API_PROXY_TARGET` environment variable (`vite.config.ts`), allowing it to target `http://localhost:3001` for local dev and `http://backend:3001` when run via Docker Compose (set in `docker-compose.yml`).
   - **Container Communication**: Services within Docker Compose communicate through the internal Docker network using service names as hostnames (e.g., `backend` service is accessible from the `frontend` service).
   - **Environment Isolation**: Each service has its own environment variables specified in the Docker Compose configuration, allowing for contextual configuration.

## Critical Implementation Paths

1. **Data Integration Flow**
   - External API → Backend Caching → Database Storage → API Endpoints → Frontend Visualization

2. **User Interaction Flow**
   - UI Controls → State Updates → Data Requests → Map Rendering → Information Display

3. **Correlation Analysis Flow**
   - Data Selection → Geospatial Joining → Statistical Analysis → Visualization → User Insights

4. **Containerized Development Flow**
   - Code Changes → Hot Reload in Container → Live Updates in Browser → Immediate Feedback Loop

## Component Relationships

- **Map Component**: Core visualization container
  - **Layer Control**: Manages visibility of data layers
  - **Legend Component**: Explains visualization colors/symbols
  - **Info Panel**: Displays detailed information for selected areas

- **Data Service Layer**: Backend abstraction for data sources
  - **Caching Service**: Optimizes API response times
  - **Aggregation Service**: Processes and combines datasets
  - **Correlation Service**: Analyzes relationships between data points 
