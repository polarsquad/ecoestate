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
  - ✅ Containerization implemented:
    - Multi-stage Docker builds for frontend and backend created
    - Docker Compose setup complete and functional for local development
    - Best practices implemented for secure, optimized containers
  - 🔄 Azure infrastructure planning in progress:
    - Terraform configuration planning for Azure Container Apps and Registry
  - 🔄 CI/CD pipeline planning in progress

- **Phase 5 (Refinement & Documentation)**: ⬜ NOT STARTED
  - Correlation logic implementation needed
  - Detailed pop-ups for insights to be developed
  - Documentation to be written
  - User feedback to be collected

## Recent Changes

- ✅ Successfully implemented Docker Compose for local development:
  - Created multi-stage Dockerfiles for both frontend and backend services
  - Configured Docker Compose with proper volume mounts and environment variables
  - Resolved cross-container communication issues with proper API proxy configuration
  - Added named volumes for `node_modules` to prevent conflicts with local directories
  - Ensured frontend Vite server accepts external connections with `--host` flag
  - Implemented dynamic API proxy configuration that works in both local and Docker environments
- ✅ Completed troubleshooting of common containerization issues:
  - Fixed "command not found" errors by ensuring dev dependencies are installed in development stage
  - Resolved connection reset errors with proper host binding configurations
  - Fixed backend API connectivity in containerized environment with correct proxy settings

## Next Steps

With the Docker Compose development environment now fully operational, the next steps are:

1. **Begin Azure Infrastructure Setup**:
   - Create Terraform configuration for Azure Container Registry
   - Configure Azure Container Apps environment
   - Set up networking resources and security settings
   - Implement Azure Key Vault for secrets management

2. **Develop CI/CD Pipeline**:
   - Set up GitHub Actions or Azure DevOps pipeline
   - Configure build, test, and deployment stages
   - Implement automated testing before deployment

3. **Start Phase 5 Work**:
   - Begin implementing correlation logic between property prices and environmental factors
   - Develop detailed location-specific insights and pop-ups
   - Create statistical analysis visualizations

## Active Decisions

- **Map Library**: Using Leaflet.js for map visualization due to its flexibility
- **Visualization Approach**: Implemented heatmap for prices and toggleable layers for environmental data
- **Deployment Strategy**: Decided on containerized approach with Azure Container Apps
- **Infrastructure Management**: Chosen Terraform for infrastructure as code to ensure reproducibility
- **Container Strategy**: 
  - Using multi-stage builds to optimize image size and security
  - Implemented Docker Compose for local development orchestration
  - Following best practices: non-root users, .dockerignore, layer optimization, correct dependency installation in dev stages, host binding for dev servers

## Current Challenges

- Ensuring secure management of API keys and secrets in production environment
- Configuring proper scaling for the application in cloud environment
- Designing effective CI/CD pipeline for reliable deployments
- Planning for efficient implementation of correlation analysis features
- Optimizing Docker image sizes for production while maintaining all required functionality

## User Feedback Insights

- Not yet collected - will be gathered after initial deployment

## Implementation Learnings

- Geospatial data visualization requires careful optimization
- Property price data from Statistics Finland requires preprocessing for effective visualization
- Environmental data layers should be togglable to prevent visual overload
- **Containerization requires careful consideration of:**
  - Build optimizations and environment configurations
  - Correct dependency installation within different build stages (e.g., `development` vs. `production`)
  - Port mappings between host and container
  - Dev server configurations (e.g., binding to `0.0.0.0` using `--host`) to accept external connections
  - Named volumes to preserve `node_modules` and prevent conflicts with local directories
- Docker Compose provides an effective solution for orchestrating multi-service local development
- **Environment variables are crucial for configuring behavior differently between local development and containerized environments**
- Vite configuration requires special attention when used in containerized environments, especially for API proxying
