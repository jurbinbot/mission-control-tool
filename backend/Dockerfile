# Mission Control Tool - Backend Dockerfile
# Compatible with Podman and Docker
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies for native modules, healthcheck tools, curl for API calls, and OpenClaw CLI
# Note: OpenClaw requires Node.js 22.12+, so we use npx to run it from the dist bundle
RUN apk add --no-cache python3 make g++ wget curl bash

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Copy frontend build (must be in backend directory for COPY)
COPY frontend-build /app/frontend/build

# Create necessary directories
RUN mkdir -p /app/backups /app/logs

# Expose port
EXPOSE 4432

# Environment variables
ENV NODE_ENV=production
ENV PORT=4432
ENV LOG_LEVEL=info

# Health check (works with podman and docker)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4432/health || exit 1

# Start the server
CMD ["node", "server.js"]