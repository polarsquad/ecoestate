# syntax=docker/dockerfile:1

# Build stage
FROM node:18-alpine AS build
WORKDIR /app

# Copy package files for better layer caching
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
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

# Commands will be provided by devcontainer.json or docker-compose.yml
CMD ["npm", "run", "dev"]

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy package files
COPY package*.json ./

# Copy only necessary files from the build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# Change ownership to the non-root user
RUN chown -R appuser:appgroup /app

# Switch to the non-root user
USER appuser

# Expose the port the server listens on (adjust if different)
EXPOSE 3001

# Start the server
CMD ["node", "dist/index.js"] 
