# Technical Context

## Technology Stack

### Frontend
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Map Visualization**: Leaflet.js or Mapbox GL JS
- **HTTP Client**: Axios
- **Styling**: Tailwind CSS
- **State Management**: React Hooks (useState, useContext)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js with TypeScript
- **API Documentation**: Swagger/OpenAPI
- **Scheduled Tasks**: Node-cron
- **Data Processing**: JavaScript/TypeScript utility libraries

### Database
- **Primary Options**: PostgreSQL or SQLite
- **ORM Possibilities**: Prisma

### External APIs
- **Property Prices**: Statistics Finland API
- **Environmental Data**: HSY WMS (Helsinki Region)
- **Geographic Data**: OpenStreetMap's Overpass API
- **Transport Data**: Digitransit API

### Deployment Infrastructure (Planned)
- **Containerization**: Docker
- **Cloud Platform**: Azure Container Apps
- **Infrastructure as Code**: Terraform
- **CI/CD**: GitHub Actions or Azure DevOps (to be finalized)

## Development Setup

### Local Environment Requirements
- **Primary Method**: Docker Compose
- Docker and Docker Compose
- Git for version control
- Code editor supporting Docker Compose (VS Code recommended)
- API keys for external services (managed via `.env` locally)

### Containerized Development (Docker Compose)
- **Multi-Service Architecture**: `docker-compose.yml` at project root orchestrates frontend and backend services (with optional database service that can be uncommented).
- **Container Builds**: Uses multi-stage Dockerfiles (`client/Dockerfile`, `server/Dockerfile`) with distinct `development` and `production` targets.
- **Development Target**: The `development` stage in each Dockerfile includes an `npm install` step to ensure dev dependencies are available.
- **Host-Container Communication**: Frontend container (Vite) uses the `--host` flag to accept connections from the host machine.
- **Port Mapping**:
  - Frontend: `3000:5173` (host:container) maps Vite's default port
  - Backend: `3001:3001` for API access
- **API Proxy Configuration**: 
  - `client/vite.config.ts` uses `loadEnv` to read the `VITE_API_PROXY_TARGET` environment variable for configuring the `/api` proxy target
  - Defaults to `http://localhost:3001` when running outside of Docker
  - Docker Compose sets `VITE_API_PROXY_TARGET=http://backend:3001` for the `frontend` service to ensure correct proxying within the Docker network
- **Volume Management**:
  - Named volumes (`frontend_node_modules`, `backend_node_modules`) to persist `node_modules` and prevent conflicts with local directories
  - Host directory mounting (`./client:/app`, `./server:/app`) for live code changes
- **Hot Reloading**: Code changes on the host are immediately reflected in the running containers
- **Environment Variables**: Managed through Docker Compose for each service

### Project Structure
- `/client` - Frontend React application
  - `Dockerfile` - Multi-stage Docker configuration for frontend
  - `vite.config.ts` - Vite configuration with dynamic API proxy
  - `package.json` - Frontend dependencies and scripts
- `/server` - Backend Node.js/Express API
  - `Dockerfile` - Multi-stage Docker configuration for backend
  - `package.json` - Backend dependencies and scripts
- `/plans` - Project documentation and planning
- `/memory-bank` - Cursor.ai assistant memory
- `docker-compose.yml` - Docker Compose configuration for local development
- `README.md` - Project documentation and setup instructions

### API Keys Management
- Development: Local .env files (not committed to git)
- Production: Secure environment variables in Azure (planned)

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

### Accessibility Standards
- WCAG 2.1 AA compliance for web interface
- Keyboard navigation support
- Screen reader compatibility

## Testing Approach

- **Frontend**: React Testing Library, Jest
- **Backend**: Jest, Supertest
- **Methodology**: Test-driven development (TDD)
- **Coverage**: Essential components and critical paths

## Technical Dependencies

### Critical Libraries
- React and React DOM
- Express.js
- Map visualization library (Leaflet/Mapbox)
- GeoJSON processing utilities
- Database client libraries

### Build & Development Tools
- TypeScript compiler
- ESLint for code quality
- Prettier for code formatting
- Vite for frontend building 
