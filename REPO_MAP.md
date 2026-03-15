# Mission Control Tool - Repository Map

## Directory Structure

```
mission-control-tool/
├── ARCHITECTURE.md        # System design and component specifications
├── TASKS.md               # Execution task list for implementation phases
├── REPO_MAP.md            # This file - repository structure documentation
├── README.md               # Project overview and operations documentation
├── .env.example           # Environment variable template
├── docker-compose.yml     # Podman Compose configuration
├── .dockerignore          # Docker build exclusions
│
├── backend/               # Backend API server
│   ├── Dockerfile         # Backend container (Podman compatible)
│   ├── .dockerignore      # Backend Docker exclusions
│   ├── package.json       # Backend dependencies
│   ├── package-lock.json  # Locked dependencies
│   ├── server.js          # Express server entrypoint
│   │
│   ├── config/            # Configuration modules
│   │   └── index.js       # Environment config loader
│   │
│   ├── middleware/        # Express middleware
│   │   ├── requestLogger.js
│   │   └── errorLogger.js
│   │
│   ├── models/            # Data models
│   │   └── task.js        # Task model definition
│   │
│   ├── routes/            # API routes (currently empty, routes in server.js)
│   │
│   ├── services/          # Business logic services
│   │   ├── monitoring.js   # System metrics collection
│   │   ├── process.js      # Process monitoring
│   │   ├── alerts.js       # Alert engine
│   │   ├── scheduler.js    # Task scheduler
│   │   ├── backup.js       # Backup automation
│   │   ├── update.js       # Update automation
│   │   ├── health.js       # Health checks
│   │   └── openclaw.js     # OpenClaw integration
│   │
│   └── utils/             # Utility functions
│       └── logger.js       # Logging utility
│
├── frontend/              # React web dashboard
│   ├── Dockerfile         # Frontend container (multi-stage build, Podman compatible)
│   ├── .dockerignore      # Frontend Docker exclusions
│   ├── nginx.conf         # Nginx configuration for SPA
│   ├── package.json       # Frontend dependencies
│   │
│   ├── public/            # Static assets
│   │   └── index.html     # HTML template
│   │
│   └── src/               # React source code
│       ├── index.js       # React entrypoint
│       ├── index.css      # Global styles
│       ├── App.js         # Main dashboard component
│       ├── App.css        # Dashboard styles
│       └── api.js         # API client functions
│
├── cli/                   # Command-line interface
│   ├── mctl.js            # CLI entrypoint (Commander)
│   └── package.json       # CLI dependencies
│
└── backups/               # Backup storage (created at runtime)
```

## Core Components

### Backend (Node.js/Express)
- **server.js**: Main Express server with all API endpoints
- **services/**: Business logic for monitoring, alerts, backups, updates, health checks, OpenClaw integration
- **config/**: Environment configuration with validation
- **middleware/**: Request/error logging middleware
- **models/**: Task model for scheduler

### Frontend (React)
- **App.js**: Main dashboard with metrics display, alerts panel, connection status
- **api.js**: Axios-based API client for all backend endpoints
- **nginx.conf**: Production nginx config with API proxy and WebSocket support

### CLI (Node.js/Commander)
- **mctl.js**: Full CLI with status, metrics, alerts, processes, openclaw, tasks, health-checks commands

### Deployment
- **docker-compose.yml**: Podman Compose configuration (works with podman-compose)
- **Dockerfile** (backend/frontend): Production-ready containers (Podman/Docker compatible)

## Authentication

Mission Control supports optional Basic Authentication:

- Set `AUTH_ENABLED=true` to enable authentication
- Configure `AUTH_USERNAME` and `AUTH_PASSWORD` in `.env`
- When enabled, all endpoints except `/health` require authentication
- WebSocket connections also require authentication (via Basic Auth headers)

## Status

All phases complete:
- Phase 0: Repository Baseline ✓
- Phase 1: Backend Foundation ✓
- Phase 2: Backend Configuration ✓
- Phase 3: Logging ✓
- Phase 4: System Metrics ✓
- Phase 5: Process Monitoring ✓
- Phase 6: Real-Time Updates (WebSocket) ✓
- Phase 7: Alerts ✓
- Phase 8: Task Scheduler ✓
- Phase 9: Backup Automation ✓
- Phase 10: Update Automation ✓
- Phase 11: Routine Checks ✓
- Phase 12: OpenClaw Integration ✓
- Phase 13: Frontend Foundation ✓
- Phase 14: Dashboard UI ✓
- Phase 15: CLI ✓
- Phase 16: Containerization ✓
- Phase 17: Documentation ✓

## Notes

- Backend runs on port 3001 by default
- Frontend runs on port 3000 by default (development)
- WebSocket streaming for real-time metrics (5-second interval)
- OpenClaw integration requires OpenClaw CLI installed
- Backups stored in `/tmp/mission-control-backups` by default