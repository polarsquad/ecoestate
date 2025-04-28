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
- **CI/CD**: (To be determined)

## Development Setup

### Local Environment Requirements
- Node.js (latest LTS version)
- npm or yarn
- TypeScript
- Database instance (PostgreSQL or SQLite)
- API keys for external services

### Project Structure
- `/client` - Frontend React application
- `/server` - Backend Node.js/Express API
- `/plans` - Project documentation and planning
- `/memory-bank` - Cursor.ai assistant memory

### API Keys Management
- Development: Local .env files (not committed to git)
- Production: Secure environment variables in Azure

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
