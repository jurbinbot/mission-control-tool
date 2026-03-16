#!/bin/bash
# Build script for Mission Control
# Run from project root: ./build.sh

set -e

echo "Building frontend..."
cd frontend
npm run build

echo "Copying frontend build to backend..."
cd ..
rm -rf backend/frontend-build
cp -r frontend/build backend/frontend-build

echo "Building container image..."
podman build --no-cache -t localhost/mission-control-backend:latest -f backend/Dockerfile backend/

echo ""
echo "Build complete!"
echo "To run: podman run -d --name mission-control-backend -p 4432:4432 \\"
echo "  -v mission-control-backups:/app/backups \\"
echo "  -v mission-control-logs:/app/logs \\"
echo "  -v mission-control-data:/app/data \\"
echo "  -v \$HOME/.openclaw:/root/.openclaw:ro \\"
echo "  -e PORT=4432 \\"
echo "  -e API_URL=https://missioncontrol.jurbin.com:4432 \\"
echo "  localhost/mission-control-backend:latest"