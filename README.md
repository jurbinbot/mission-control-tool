# Mission Control Tool

A monitoring and automation system for environments running OpenClaw.

## Purpose

Mission Control Tool provides:

- Real-time system monitoring (CPU, memory, disk, uptime)
- Process monitoring with OpenClaw integration
- Automated maintenance tasks (backups, updates, health checks)
- Real-time alerting via WebSocket
- Web dashboard for visualization
- CLI interface for command-line operations

## Architecture

The system consists of three main layers:

1. **Frontend Dashboard** - Displays system metrics, processes, alerts, and task status
2. **Backend Server** - REST API, WebSocket events, monitoring engine, alert system, task scheduler
3. **Host System** - Monitored processes and system resources

## Local Development

### Prerequisites

- Node.js (for backend and frontend)
- npm or yarn
- Podman (for containerized deployment, optional)

### Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Start the backend server:
   ```bash
   npm run backend
   ```
5. Start the frontend development server:
   ```bash
   npm run frontend
   ```

### Available Scripts

- `npm run backend` - Start the backend server
- `npm run frontend` - Start the frontend development server
- `npm run dev` - Run both backend and frontend in development mode
- `npm run build` - Build the frontend for production
- `npm run test` - Run tests (when implemented)

### Containerized Deployment (Podman)

**Note:** This project uses Podman instead of Docker. Podman is a daemonless container engine that provides Docker-compatible CLI.

#### Prerequisites

```bash
# Verify Podman is installed
podman --version

# Install podman-compose if needed
pip install podman-compose
# or
pip3 install podman-compose
```

#### Build and Run

Build images manually:

```bash
# Build backend image
podman build -t mission-control-backend ./backend

# Build frontend image (optional)
podman build -t mission-control-frontend ./frontend

# Run backend container
podman run -d --name mission-control-backend \
  -p 3001:3001 \
  -v mission-control-backups:/app/backups \
  -v mission-control-logs:/app/logs \
  -v /usr/bin/openclaw:/usr/bin/openclaw:ro \
  -v ~/.openclaw:/root/.openclaw:ro \
  mission-control-backend
```

Using Podman Compose:

```bash
# Start all services (backend only)
podman-compose up -d

# Start with frontend
podman-compose --profile full up -d

# View logs
podman-compose logs -f

# Stop services
podman-compose down
```

#### Systemd Integration (Optional)

Generate systemd service for auto-start:

```bash
# Generate systemd unit
podman generate systemd --name mission-control-backend --files

# Copy to systemd directory
cp container-mission-control-backend.service ~/.config/systemd/user/

# Enable and start
systemctl --user enable --now container-mission-control-backend
```

#### Podman vs Docker

| Feature | Podman | Docker |
|---------|--------|--------|
| Daemon | Daemonless | Requires dockerd |
| Root | Rootless by default | Requires root/rootless setup |
| Compose | podman-compose | docker-compose |
| Systemd | Native integration | Requires manual setup |
| Socket | No daemon socket | /var/run/docker.sock |

## API Endpoints

### Health & Status
- `GET /health` - Health check endpoint
- `GET /metrics` - System metrics (CPU, memory, disk, uptime)
- `GET /processes` - List monitored processes
- `GET /alerts` - Current alerts
- `GET /tasks` - Task status and history

### Health Checks
- `GET /health-checks` - List health check results
- `GET /health-checks/latest` - Get latest health check
- `POST /health-checks/run` - Run health checks manually

### Backups
- `GET /backups` - List available backups
- `POST /backups` - Create a new backup
- `DELETE /backups/:name` - Delete a backup
- `POST /backups/:name/restore` - Restore from a backup

### Updates
- `GET /update/status` - Get update status
- `POST /update/check` - Check for updates (dry run)
- `POST /update` - Perform update
- `POST /update/rollback` - Rollback an update

### OpenClaw Integration
- `GET /openclaw/status` - OpenClaw runtime status
- `GET /openclaw/health` - OpenClaw health summary
- `GET /openclaw/runtime` - OpenClaw runtime info
- `GET /openclaw/tasks` - OpenClaw task status
- `GET /openclaw/connectivity` - Test OpenClaw connectivity

### WebSocket
- `WS /` - Real-time WebSocket event stream

---

## Operations

### Backup Process

Backups are created automatically by the scheduler (default: daily at 3 AM).

**Manual Backup (API):**
```bash
curl -X POST http://localhost:3001/backups
```

**Manual Backup (CLI):**
```bash
# Via mctl CLI (if installed)
mctl backups --create
```

**Backup Location:**
Backups are stored in `/tmp/mission-control-backups` by default, or the path specified by `BACKUP_DIR` environment variable.

**Backup Contents:**
- Backend directory (config, services, server)
- Frontend directory (if exists)
- Configuration files

**Automatic Cleanup:**
The system maintains a maximum of 10 backups by default. Older backups are automatically deleted when new ones are created.

### Restore Process

**List Available Backups:**
```bash
curl http://localhost:3001/backups
```

**Restore from Backup:**
```bash
curl -X POST http://localhost:3001/backups/backup-2026-03-14/restore
```

**Important Notes:**
1. Restore operations overwrite current files
2. The backend server should be stopped before restore
3. After restore, restart the backend server
4. Verify configuration files after restore

**Restore Steps:**
1. Stop the backend: `pm stop mission-control` or `docker-compose down`
2. Run restore: `curl -X POST http://localhost:3001/backups/<backup-name>/restore`
3. Extract backup if needed: `tar -xzf <backup-name>.tar.gz`
4. Restart the backend: `pm start mission-control` or `docker-compose up -d`
5. Verify services: `curl http://localhost:3001/health`

### Update Process

**Check for Updates (Dry Run):**
```bash
curl -X POST http://localhost:3001/update/check
```

**Perform Update:**
```bash
curl -X POST http://localhost:3001/update
```

**Update with Dry Run First:**
```bash
# First, check what would be updated
curl -X POST http://localhost:3001/update -H "Content-Type: application/json" -d '{"dryRun":true}'

# Then, perform actual update
curl -X POST http://localhost:3001/update
```

**Rollback Update:**
```bash
curl -X POST http://localhost:3001/update/rollback -H "Content-Type: application/json" -d '{"updateName":"update-2026-03-14"}'
```

**Scheduled Updates:**
Updates are scheduled automatically (default: daily at 4 AM). The schedule can be configured via `UPDATE_SCHEDULE` environment variable.

---

## Troubleshooting

### Backend Won't Start

**Symptoms:** Backend fails to start or crashes immediately.

**Solutions:**
1. Check if port 3001 is already in use:
   ```bash
   lsof -i :3001
   ```
2. Verify Node.js version (requires Node 18+):
   ```bash
   node --version
   ```
3. Check environment variables in `.env`:
   ```bash
   cat .env
   ```
4. Review logs:
   ```bash
   tail -f logs/agent.log
   ```

### Cannot Connect to Backend

**Symptoms:** Frontend shows "Disconnected" or API calls fail.

**Solutions:**
1. Verify backend is running:
   ```bash
   curl http://localhost:3001/health
   ```
2. Check CORS settings if frontend is on different port
3. Verify firewall rules:
   ```bash
   sudo firewall-cmd --list-ports
   ```
4. Check backend logs for errors

### OpenClaw Integration Not Working

**Symptoms:** OpenClaw status shows "Not available" or errors.

**Solutions:**
1. Verify OpenClaw CLI is installed:
   ```bash
   which openclaw
   openclaw --version
   ```
2. Check OpenClaw gateway is running:
   ```bash
   openclaw status
   ```
3. For Podman deployments, ensure OpenClaw is mounted:
   ```yaml
   volumes:
     - /usr/bin/openclaw:/usr/bin/openclaw:ro
     - ${HOME}/.openclaw:/root/.openclaw:ro
   ```
4. Test connectivity manually:
   ```bash
   curl http://localhost:3001/openclaw/connectivity
   ```

### High Memory Usage

**Symptoms:** Backend consuming excessive memory.

**Solutions:**
1. Check WebSocket connections - may have leaks:
   ```bash
   curl http://localhost:3001/metrics
   ```
2. Reduce metrics streaming interval
3. Clear old backups:
   ```bash
   curl http://localhost:3001/backups
   curl -X DELETE http://localhost:3001/backups/<old-backup>
   ```
4. Restart backend to clear memory

### Backup Failures

**Symptoms:** Backups not created or failing.

**Solutions:**
1. Check backup directory permissions:
   ```bash
   ls -la /tmp/mission-control-backups
   ```
2. Verify disk space:
   ```bash
   df -h
   ```
3. Check scheduler logs for errors
4. Run backup manually to see errors:
   ```bash
   curl -X POST http://localhost:3001/backups
   ```

### WebSocket Connection Drops

**Symptoms:** Dashboard stops updating, no real-time data.

**Solutions:**
1. Check browser console for WebSocket errors
2. Verify nginx WebSocket proxy (if using Podman):
   ```nginx
   location /ws {
       proxy_pass http://backend:3001;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "Upgrade";
   }
   ```
3. Check backend logs for WebSocket errors
4. Refresh the browser page

---

## Operational Checklist

### Daily Checks
- [ ] Verify backend health: `curl http://localhost:3001/health`
- [ ] Check system metrics: `curl http://localhost:3001/metrics`
- [ ] Review active alerts: `curl http://localhost:3001/alerts`
- [ ] Verify backup completed: `curl http://localhost:3001/backups`
- [ ] Check OpenClaw status: `curl http://localhost:3001/openclaw/health`

### Weekly Checks
- [ ] Review disk space usage
- [ ] Clean up old backups (keep last 10)
- [ ] Check for system updates
- [ ] Review health check history
- [ ] Verify scheduled tasks are running

### Monthly Checks
- [ ] Full backup verification (test restore)
- [ ] Review and rotate logs
- [ ] Update dependencies if needed
- [ ] Review security configurations
- [ ] Performance review (response times, memory usage)

### Incident Response

**High CPU Alert:**
1. Check running processes: `curl http://localhost:3001/processes`
2. Identify high-CPU process
3. Review recent changes
4. Scale resources or optimize if needed

**High Memory Alert:**
1. Check process memory usage
2. Restart backend if leaking
3. Review WebSocket connections
4. Check for memory-intensive tasks

**High Disk Alert:**
1. Check disk usage: `df -h`
2. Clean up old backups
3. Clear log files if oversized
4. Archive or move old data

**Process Down Alert:**
1. Identify missing process
2. Check process logs
3. Restart process if needed
4. Review OpenClaw gateway status

**OpenClaw Not Responding:**
1. Test connectivity: `openclaw status`
2. Check gateway port availability
3. Review OpenClaw logs
4. Restart OpenClaw if needed: `openclaw gateway restart`

---

## Documentation

- [Architecture](./ARCHITECTURE.md) - System design and component specifications
- [Tasks](./TASKS.md) - Implementation task list by phase

## License

Proprietary - OpenClaw ecosystem