# Mission Control Tool – Task List

Execution Rules

- Always perform **one task at a time**
- After finishing a task:
  - mark the checkbox `[x]`
  - update any affected documentation
  - stop execution
- Do not start another task automatically
- If blocked, write the blocker in this file

---

# Phase 0 — Repository Baseline

## Inspect repository

- [x] List the root files of the repository
- [x] Confirm the current project directory structure
- [x] Update `REPO_MAP.md` so it matches the actual file structure

## Runtime confirmation

- [x] Confirm the backend language
- [x] Confirm the frontend language
- [x] Confirm the backend entrypoint file
- [x] Confirm the frontend entrypoint file

## Documentation

- [x] Ensure `README.md` exists
- [x] Add a short project description to `README.md`
- [x] Add local development startup instructions to `README.md`

---

# Phase 1 — Backend Foundation

## Backend structure

- [x] Ensure a backend source directory exists
- [x] Ensure a backend entrypoint file exists
- [x] Ensure a `routes` directory exists
- [x] Ensure a `services` directory exists
- [x] Ensure a `config` directory exists

## Basic server

- [x] Ensure the backend can start successfully
- [x] Add a `/health` endpoint
- [x] Confirm `/health` returns status OK

---

# Phase 2 — Backend Configuration

## Environment configuration

- [x] Create `.env.example`
- [x] Add backend port variable
- [x] Add log level variable

## Config loader

- [x] Add environment variable loader
- [x] Validate required variables on startup

---

# Phase 3 — Logging

## Logger

- [x] Create a logger utility
- [x] Add request logging middleware
- [x] Add error logging utility

## Verification

- [x] Verify logs appear when the server starts
- [x] Verify logs appear when requests are made

---

# Phase 4 — System Metrics

## Metrics design

- [x] Define JSON format for system metrics
- [x] Define JSON format for process metrics

## System metrics collection

- [x] Add CPU usage collection
- [x] Add memory usage collection
- [x] Add disk usage collection
- [x] Add system uptime collection

## Metrics endpoint

- [x] Create `/metrics` endpoint
- [x] Return current system metrics

---

# Phase 5 — Process Monitoring

## Process discovery

- [x] Implement process discovery
- [x] Detect OpenClaw related processes
- [x] Capture process resource usage

## API

- [x] Create `/processes` endpoint
- [x] Return process monitoring data

---

# Phase 6 — Real-Time Updates

## Websocket server

- [x] Add websocket server
- [x] Accept websocket connections
- [x] Emit a test message on connect

## Metrics streaming

- [x] Emit metrics on interval
- [x] Make interval configurable
- [x] Prevent duplicate intervals

---

# Phase 7 — Alerts

## Alert rules

- [x] Define CPU alert threshold
- [x] Define memory alert threshold
- [x] Define disk alert threshold
- [x] Define process-down alert rule

## Alert engine

- [x] Implement CPU alert detection
- [x] Implement memory alert detection
- [x] Implement disk alert detection
- [x] Implement process-down detection

## API

- [x] Include alerts in monitoring payload

---

# Phase 8 — Task Scheduler

## Scheduler setup

- [x] Add scheduler module
- [x] Create scheduler initialization code
- [x] Verify scheduler starts with backend

## Task model

- [x] Define task object format
- [x] Define task status states

---

# Phase 9 — Backup Automation

## Backup service

- [x] Create backup service file
- [x] Create backup directory if missing
- [x] Implement backup command execution

## Scheduling

- [x] Register backup task
- [x] Verify backup runs successfully

---

# Phase 10 — Update Automation

## Update service

- [x] Create update service file
- [x] Implement update dry-run mode
- [x] Implement update execution logic

## Scheduling

- [x] Register update task
- [x] Verify update task runs safely

---

# Phase 11 — Routine Checks

## Health checks

- [x] Implement disk-space check
- [x] Implement process-running check
- [x] Implement endpoint health check

## Scheduled routine

- [x] Register routine check task
- [x] Log failures

---

# Phase 12 — OpenClaw Integration

## Status integration

- [x] Create OpenClaw integration service
- [x] Implement connectivity test
- [x] Fetch OpenClaw task status

## API

- [x] Expose OpenClaw status endpoint

---

# Phase 13 — Frontend Foundation

## Frontend structure

- [x] Confirm frontend framework
- [x] Ensure frontend app builds successfully
- [x] Create base dashboard page

## Backend connection

- [x] Add API client
- [x] Add health check request

---

# Phase 14 — Dashboard UI

## Metrics UI

- [x] Create CPU usage display
- [x] Create memory usage display
- [x] Create disk usage display

## Alerts UI

- [x] Create alerts panel
- [x] Display alert messages

---

# Phase 15 — CLI

## CLI foundation

- [x] Create CLI entrypoint
- [x] Add `status` command

## CLI monitoring

- [x] Add `metrics` command
- [x] Add `alerts` command

---

# Phase 16 — Containerization

## Docker

- [x] Create backend Dockerfile
- [x] Create `.dockerignore`
- [x] Build backend container

## Local deployment

- [x] Create docker-compose file
- [x] Verify services start

---

# Phase 17 — Documentation

## Operations

- [x] Document backup process
- [x] Document restore process
- [x] Document update process

## Maintenance

- [x] Add troubleshooting section
- [x] Add operational checklist