# EcoEstate Frontend

This directory contains the frontend application for EcoEstate, a web application designed to visualize property prices and their correlation with environmental quality indicators in Finland.

## Overview

The frontend is a single-page application built using React and TypeScript. It provides an interactive map interface allowing users to explore various data layers, including property prices, green spaces, and public transport accessibility.

## Technologies Used

- **Framework**: React
- **Language**: TypeScript
- **Build Tool**: Vite
- **Map Visualization**: Leaflet.js
- **HTTP Client**: Axios (for communication with the backend API)
- **Linting**: ESLint with recommended TypeScript and React rules.

## Project Structure

- `public/`: Static assets.
- `src/`: Application source code.
  - `components/`: Reusable React components.
  - `utils/`: Utility functions.
  - `App.tsx`: Main application component.
  - `main.tsx`: Application entry point.
- `index.html`: Main HTML file.
- `vite.config.ts`: Vite configuration.
- `tsconfig.json`, `tsconfig.node.json`, `tsconfig.app.json`: TypeScript configurations.
- `Dockerfile`: For building the production Docker image.
- `nginx.conf`: Nginx configuration for serving the application in production and proxying API requests.
- `entrypoint.sh`: Script used in the Docker image to prepare and start Nginx.

## Available Scripts

In the `package.json`, you can find scripts for:

- `dev`: Starts the Vite development server. (can also run via Docker Compose)
- `build`: Builds the application for production.
- `lint`: Runs ESLint.
- `preview`: Serves the production build locally for preview.

This README provides a basic overview. For more detailed architectural decisions, deployment strategies, and system patterns, please refer to the documents in the `/memory-bank` directory at the project root.
