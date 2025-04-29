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
FROM nginx:alpine AS production
WORKDIR /usr/share/nginx/html

# Remove default Nginx static assets
RUN rm -rf ./*

# Copy built assets from the build stage
COPY --from=build /app/dist .

# Add custom Nginx config if needed
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"] 
