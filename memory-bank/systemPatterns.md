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

## Critical Implementation Paths

1. **Data Integration Flow**
   - External API → Backend Caching → Database Storage → API Endpoints → Frontend Visualization

2. **User Interaction Flow**
   - UI Controls → State Updates → Data Requests → Map Rendering → Information Display

3. **Correlation Analysis Flow**
   - Data Selection → Geospatial Joining → Statistical Analysis → Visualization → User Insights

## Component Relationships

- **Map Component**: Core visualization container
  - **Layer Control**: Manages visibility of data layers
  - **Legend Component**: Explains visualization colors/symbols
  - **Info Panel**: Displays detailed information for selected areas

- **Data Service Layer**: Backend abstraction for data sources
  - **Caching Service**: Optimizes API response times
  - **Aggregation Service**: Processes and combines datasets
  - **Correlation Service**: Analyzes relationships between data points 
