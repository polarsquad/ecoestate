# Technical Implementation Roadmap: Property Prices and Environmental Quality Correlation Map App

## 🎯 Project Overview

Develop a web app providing interactive map-based visualizations and correlations between property prices and environmental quality indicators in Finland.

**Stack:** React, TypeScript, Node.js (Express), PostgreSQL/SQLite, Open APIs, Cloud Deployment

---

## ✅ Phase 1: Initial Project Setup & Data Exploration

### Tasks
- [x] Set up Git repository and basic folder structure
- [x] Initialize React frontend (Vite or Next.js recommended)
- [x] Set up backend API (Node.js + Express + TypeScript)
- [x] Choose & initialize database (PostgreSQL or SQLite)
- [x] Register and get API keys if needed
  - [x] Statistics Finland
  - [x] HSY WMS
  - [x] Digitransit
  - [x] OpenStreetMap's Overpass API
- [x] Verify API data availability and quality through exploratory API calls
  - [x] Statistics Finland
  - [x] HSY WMS

### Deliverables
- [x] Working frontend/backend skeleton apps
- [x] Initial exploration script confirming data availability

---

## ✅ Phase 2: Data Integration and Backend Development

### Tasks
- [x] Create backend endpoints to fetch:
    - [x] Property prices (Statistics Finland API)
    - [x] Green-space data and Public Transport locations (OpenStreetMap, HSY WMS)
    - [x] Postcode area boundaries
- [x] Develop automated scheduled tasks to periodically cache/update data

### Deliverables
- [x] REST API endpoints serving aggregated data
- [x] Caching mechanism to optimize API response times

---

## ✅ Phase 3: Frontend Development & Interactive Map Visualization

### Tasks
- [x] Integrate React mapping library (Leaflet or Mapbox GL JS)
- [x] Render property price data on interactive map layers
  - [x] Snapshot of prices for a specific year shown per postcode and visualized with a
        heatmap
  - [x] Ability to select the year for which prices are shown
  - [x] Ability to select between multiple togglable visualizations
        (the heatmap is the first one)
  - [x] Different togglable visualization for price trend
        (toggle between this and the heatmap)
- [x] Render environmental data on interactive map layers
- [x] Implement UI components to toggle visibility of layers (green-space)

### Deliverables
- [x] Interactive, fully functional map interface
- [x] Layer toggling and user-friendly UI interactions

---

## 🔄 Phase 4: Deployment and Testing

### Completed Tasks

#### ✅ Containerization
- [x] Frontend Container Setup
  - [x] Created multi-stage Dockerfile for frontend
  - [x] Added .dockerignore file for frontend
  - [x] Tested frontend container build and run locally

- [x] Backend Container Setup
  - [x] Created multi-stage Dockerfile for backend
  - [x] Added .dockerignore file for backend
  - [x] Tested backend container build and run locally

- [x] Docker Compose for Local Development
  - [x] Created docker-compose.yml in project root
  - [x] Implemented named volumes for node_modules
  - [x] Configured environment variables for service communication
  - [x] Tested and verified Docker Compose setup

### 🔄 Next Steps to Complete

#### Infrastructure as Code Setup
- [ ] Create Terraform configuration for Azure infrastructure
  - [ ] Define Azure Container Registry resource
  - [ ] Configure Azure Container Apps environment
  - [ ] Setup networking resources (VNet, subnets if needed)
  - [ ] Create variables for environment-specific configurations

#### Secrets and Environment Management
- [ ] Configure environment variables securely
  - [ ] Setup Azure Key Vault for secrets management
  - [ ] Configure environment variable injection into containers
  - [ ] Ensure proper separation of dev/staging/prod environments

#### CI/CD Pipeline
- [ ] Setup automated build and deployment
  - [ ] Create GitHub Actions or Azure DevOps pipeline
  - [ ] Configure build, test, and deployment stages
  - [ ] Set up automated testing before deployment

#### Deployment and Verification
- [ ] Deploy backend and frontend to Azure Container Apps
  - [ ] Push container images to registry
  - [ ] Deploy containers using Terraform
  - [ ] Configure load balancing and scaling rules
- [ ] Test deployment thoroughly
  - [ ] Verify API responsiveness in production environment
  - [ ] Test frontend interactivity in production
  - [ ] Conduct performance tests (loading speed, API latency)
  - [ ] Test on multiple browsers and devices

### Deliverables
- [x] Containerized applications (frontend and backend)
- [x] Docker Compose configuration for local development
- [ ] Publicly accessible, functional MVP web application
- [ ] CI/CD pipeline for automated deployments
- [ ] Infrastructure as Code templates for reproducible environments

---

## ⬜ Phase 5: Refinement & Documentation

### Tasks
- [ ] Implement initial correlation logic (basic aggregation by postal code/municipality)
- [ ] Develop detailed pop-ups providing correlation insights at selected locations
- [ ] Write user-friendly documentation and usage guidelines
- [ ] Document code clearly (frontend/backend)
- [ ] Collect initial user feedback and address critical issues
- [ ] Plan future improvements based on user feedback and usage analytics

### Deliverables
- Comprehensive README and user documentation
- Code repository with clear instructions

---

## Testing rules

- Both frontend and backend code needs tests
- Test-driven development should be used
  - If an implementation already exists, it is OK for tests written against it to succeed
- When making changes, be sure to always run tests to verify their correctness

---

## 🔮 Future Expansion Opportunities (Beyond MVP)

- Advanced correlation analysis (regression, ML predictions)
- User-generated content (reviews, environmental feedback)
- Real-time data updates and push notifications
- International expansion beyond Finland

---

## 🛠️ Key Technical Resources (APIs & Libraries)

### APIs:
- **Property Prices:** [Statistics Finland API](https://www.stat.fi/org/avoindata/)
- **Helsinki Region Data (HSY WMS):** [HSY GeoServer](https://kartta.hsy.fi/geoserver/web/) (Used for walking distance to stations, potential for other regional data)
- **Geographic & Transport Data:** [OpenStreetMap](https://www.openstreetmap.org/), [Digitransit](https://digitransit.fi/en/developers/)

### Libraries:
- **Frontend:** React, Leaflet.js or Mapbox GL JS, Axios, Tailwind CSS
- **Backend:** Express.js, Axios, Prisma, Node-cron (for scheduled jobs)
