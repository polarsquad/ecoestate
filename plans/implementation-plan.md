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
- [x] Develop automated scheduled tasks to periodically cache/update data
- [ ] Implement initial correlation logic (basic aggregation by postal code/municipality)

### Deliverables
- REST API endpoints serving aggregated data and correlations
- Caching mechanism to optimize API response times

---

## ✅ Phase 3: Frontend Development & Interactive Map Visualization

### Tasks
- [ ] Integrate React mapping library (Leaflet or Mapbox GL JS)
- [ ] Render property prices and environmental data on interactive map layers
- [ ] Implement UI components to toggle visibility of layers (green-space, transport)
- [ ] Develop detailed pop-ups providing correlation insights at selected locations

### Deliverables
- Interactive, fully functional map interface
- Layer toggling and user-friendly UI interactions

---

## ✅ Phase 4: Deployment and Testing

### Tasks
- [ ] Deploy backend and frontend to cloud service (e.g., Railway, Vercel, or Fly.io)
- [ ] Configure environment variables securely
- [ ] Test deployment thoroughly (API responsiveness, frontend interactivity)
- [ ] Conduct performance tests (loading speed, API latency)

### Deliverables
- Publicly accessible, functional MVP web application

---

## ✅ Phase 5: Refinement & Documentation

### Tasks
- [ ] Write user-friendly documentation and usage guidelines
- [ ] Document code clearly (frontend/backend)
- [ ] Collect initial user feedback and address critical issues
- [ ] Plan future improvements based on user feedback and usage analytics

### Deliverables
- Comprehensive README and user documentation
- Code repository with clear instructions

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
- **Backend:** Express.js, Axios, TypeORM or Prisma, Node-cron (for scheduled jobs)

---

## 🚩 Next Actions:

The basic project setup is complete! Next steps:
1. Register for required API keys (Statistics Finland)
2. Create exploratory scripts to verify API data availability
3. Proceed to Phase 2 (Data Integration and Backend Development)
