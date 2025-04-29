# EcoEstate: Property Prices and Environmental Quality Correlation Map

This application provides interactive map-based visualizations and correlations between property prices and
environmental quality indicators in Finland.

This is a sandbox project for trying out different agentic programming techniques. Most of the code is written
by LLMs. Since this project exists for experimenting with different techniques and finding what works best,
don't expect to see clean code everywhere. The tests probably do weird stuff. The code is unnecessarily complex
in places. Development has emphasized the meta aspects of AI-augmented programming rather than aiming for
really high quality code in all instances, though the goal is also to iteratively get to higher quality
through this experimentation.

## Project Structure

- **client/** - React/TypeScript frontend with Leaflet.js for map visualization
- **server/** - Node.js/Express backend API with data integration services
- **plans/** - Project planning documents and roadmap

## Containerized Development Environment

This project is fully containerized for consistent development and deployment with Docker Compose.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Development with Docker Compose

To start the entire application stack:

```bash
# From the project root
docker compose up --build
```

This will:
- Build and start the frontend container (accessible at http://localhost:3000)
- Build and start the backend container (accessible at http://localhost:3001)
- Set up named volumes for node_modules dependencies
- Configure volume mounts for live code changes with hot reloading
- Establish communication between services via the internal Docker network

### Container Structure

#### Frontend Container
- **Base image:** Node 18 Alpine
- **Development target:** Provides live-reloading development environment with Vite
- **Production target:** Optimized Nginx-based static file serving

#### Backend Container
- **Base image:** Node 18 Alpine
- **Development target:** Provides live-reloading TypeScript development
- **Production target:** Optimized for security and production use

### Key Features of the Development Environment

- **Hot Reloading**: Changes to source code are immediately reflected in the running application
- **Named Volumes**: `node_modules` are preserved in Docker volumes to prevent conflicts with local directories
- **Environment Variables**: Configured in Docker Compose for proper service communication
- **API Proxy**: Frontend Vite server is configured to proxy API requests to the backend service
- **Cross-Container Communication**: Services can communicate using their service names as hostnames

## Building for Production

To build production-ready containers:

```bash
# Build frontend production image
docker build -t ecoestate-frontend:latest --target production ./client

# Build backend production image
docker build -t ecoestate-backend:latest --target production ./server
```

## Testing Container Builds Locally

```bash
# Test frontend container
docker run -p 8080:80 ecoestate-frontend:latest

# Test backend container
docker run -p 3001:3001 ecoestate-backend:latest
```

## Deployment

The project is planned to be deployed to Azure Container Apps using Terraform for infrastructure as code. See the deployment documentation in `plans/implementation-plan.md` for details on the deployment strategy.

## Current Project Status

- ✅ Phase 1: Initial Project Setup & Data Exploration - COMPLETE
- ✅ Phase 2: Data Integration and Backend Development - COMPLETE
- ✅ Phase 3: Frontend Development & Interactive Map Visualization - COMPLETE
- 🔄 Phase 4: Deployment and Testing - IN PROGRESS
  - ✅ Containerization with Docker fully implemented
  - 🔄 Planning Azure infrastructure setup with Terraform
  - 🔄 Planning CI/CD pipeline
- ⬜ Phase 5: Refinement & Documentation - NOT STARTED

## Development Notes

- Container configurations are optimized for development workflow with hot reloading
- Node modules are stored in Docker volumes to avoid overwriting local node_modules
- Environmental variables are crucial for configuring behavior differently between local development and containerized environments
- Vite server is configured with the `--host` flag to accept connections from the host machine
