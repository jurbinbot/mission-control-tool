# Mission Control Tool - Backend Dockerfile
# Compatible with Podman and Docker
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies for native modules, healthcheck tools, and curl for API calls
RUN apk add --no-cache python3 make g++ wget curl

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
EXPOSE 3001

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV LOG_LEVEL=info

# Health check (works with podman and docker)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the server
CMD ["node", "server.js"]