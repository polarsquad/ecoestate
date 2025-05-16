# EcoEstate Backend

This directory contains the backend server for the EcoEstate application. It's a Node.js application built with Express.js and TypeScript, responsible for serving data to the frontend, managing data integrations, and handling business logic.

## Overview

The backend provides a RESTful API that the frontend client consumes. It fetches data from various external sources (like Statistics Finland API, HSY WMS, OpenStreetMap, Digitransit), processes and aggregates this data, and exposes it through a set of secure endpoints. It also handles scheduled tasks for data updates and implements caching mechanisms for performance.

## Technologies Used

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript

## Project Structure

- `prisma/`: Prisma schema, migrations, and client generation (unused so far).
- `src/`: Application source code.
  - `routes/`: API route definitions.
  - `scripts/`: Exploratory scripts for APIs (not used in the backend implementation).
  - `services/`: Business logic, data fetching, and processing modules.
  - `utils/`: Utility functions and helper modules.
  - `index.ts`: Application entry point and server setup.
- `Dockerfile`: For building the production Docker image.
- `tsconfig.json`: TypeScript configuration.
- `eslint.config.mjs`: ESLint configuration.
- `jest.config.ts`: Jest testing framework configuration.
- `package.json`: Project dependencies and scripts.

## Available Scripts (from `package.json`)

- `dev`: Starts the backend server in development mode with hot reloading (e.g., using `nodemon` and `ts-node`). Typically managed by Docker Compose.
- `build`: Compiles TypeScript code to the `dist/` directory.
- `lint`: Runs ESLint to check for code quality issues.
- `test`: Executes tests using Jest.

### Exploratory API Test Scripts

These scripts are used for ad-hoc testing of external API integrations during development and are not part of the regular test suite.

- `test:statfi`: Runs a script to test integration with the Statistics Finland API.
- `test:openaq`: Runs a script to test integration with the OpenAQ API.
- `test:hsywms`: Runs a script to test integration with the HSY WMS API.
- `test:digitransit`: Runs a script to test integration with the Digitransit API.
- `test:osm`: Runs a script to test integration with the Overpass API (OpenStreetMap).

This README provides a backend-specific overview. For more detailed architectural decisions, data flow, deployment strategies, and system patterns, please refer to the documents in the `/memory-bank` directory at the project root. 
