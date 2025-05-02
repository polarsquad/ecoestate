# syntax=docker/dockerfile:1

# Build stage - used for production build
FROM node:18-alpine AS build
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Development stage - used for Dev Containers and local development
FROM node:18-alpine AS development
WORKDIR /app

# Install git for potential development needs
RUN apk add --no-cache git

# Install dependencies for development
COPY package*.json ./
RUN npm install

# Commands will be provided in devcontainer.json or docker-compose.yml
CMD ["npm", "run", "dev"]

# Production stage - using Nginx to serve static files
FROM nginx:1.25-alpine AS production

# Install gettext for envsubst
RUN apk add --no-cache gettext

WORKDIR /usr/share/nginx/html

# Remove default Nginx static assets
RUN rm -rf ./*

# Copy built assets from the build stage
COPY --from=build /app/dist .

# Copy the Nginx config template
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy the entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose port
EXPOSE 80

# Run the entrypoint script
ENTRYPOINT ["/entrypoint.sh"] 
