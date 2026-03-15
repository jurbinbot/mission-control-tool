#!/usr/bin/env node

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const config = require('./config');
const requestLogger = require('./middleware/requestLogger');
const errorLogger = require('./middleware/errorLogger');
const logger = require('./utils/logger');
const monitoring = require('./services/monitoring');
const processService = require('./services/process');
const alertsService = require('./services/alerts');
const scheduler = require('./services/scheduler');
const backupService = require('./services/backup');
const updateService = require('./services/update');
const healthService = require('./services/health');
const openclawService = require('./services/openclaw');
const boardTaskService = require('./models/boardTask');

const app = express();

// Enable CORS for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Start scheduler
scheduler.start();

// Register backup task
scheduler.addTask('backup', '0 3 * * *', () => {
  return backupService.createBackup();
});

// Register update task
scheduler.addTask('update', '0 4 * * *', () => {
  return updateService.checkForUpdates();
});

// Register health check task
scheduler.addTask('health-check', '0 */15 * * * *', () => {
  return healthService.runAllChecks();
});
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend/build')));

// Serve frontend index for SPA routes
app.get('/', (req, res, next) => {
  const indexPath = path.join(__dirname, 'frontend/build/index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    next();
  }
});
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  logger.info('Health check request received');
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const metrics = monitoring.getSystemMetrics();
  const alerts = alertsService.getAllAlerts().slice(-5); // Include last 5 alerts

  res.json({
    ...metrics,
    alerts: alerts
  });
});

// Processes endpoint
app.get('/processes', (req, res) => {
  const processes = processService.getAllProcesses();
  res.json(processes);
});

// Alerts endpoint
app.get('/alerts', (req, res) => {
  const alerts = alertsService.getAllAlerts();
  res.json(alerts);
});

// Tasks endpoint
app.get('/tasks', (req, res) => {
  const tasks = scheduler.getTasks();
  res.json(tasks);
});

// Health check endpoints
app.get('/health-checks', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const results = healthService.getResults(limit);
  res.json(results);
});

app.get('/health-checks/latest', (req, res) => {
  const result = healthService.getLatestResult();
  if (result) {
    res.json(result);
  } else {
    res.json({ status: 'no-results', message: 'No health checks have been run yet' });
  }
});

app.post('/health-checks/run', (req, res) => {
  const result = healthService.runAllChecks();
  res.json(result);
});

// OpenClaw integration endpoints
app.get('/openclaw/status', (req, res) => {
  const status = openclawService.fetchStatus();
  res.json(status);
});

app.get('/openclaw/health', (req, res) => {
  const health = openclawService.getHealthSummary();
  res.json(health);
});

app.get('/openclaw/runtime', (req, res) => {
  const runtime = openclawService.getRuntimeInfo();
  res.json(runtime);
});

app.get('/openclaw/tasks', (req, res) => {
  const tasks = openclawService.getTaskStatus();
  res.json(tasks);
});

app.get('/openclaw/connectivity', (req, res) => {
  const connectivity = openclawService.testConnectivity();
  res.json(connectivity);
});

// Backup endpoints
app.post('/backups', (req, res) => {
  const backupName = req.body.name || null;
  const backup = backupService.createBackup(backupName);
  res.json(backup);
});

app.get('/backups', (req, res) => {
  const backups = backupService.getBackups();
  res.json(backups);
});

app.delete('/backups/:name', (req, res) => {
  const backup = backupService.deleteBackup(req.params.name);
  res.json(backup);
});

app.post('/backups/:name/restore', (req, res) => {
  const restore = backupService.restoreBackup(req.params.name);
  res.json(restore);
});

// Update endpoints
app.get('/update/status', (req, res) => {
  const status = updateService.getUpdateStatus();
  res.json(status);
});

app.post('/update/check', (req, res) => {
  const check = updateService.checkForUpdates();
  res.json(check);
});

app.post('/update', (req, res) => {
  const options = req.body.dryRun ? { dryRun: true } : {};
  const result = updateService.performUpdate(options);
  res.json(result);
});

app.post('/update/rollback', (req, res) => {
  const { updateName } = req.body;
  const result = updateService.rollback(updateName);
  res.json(result);
});

// Board Task Management (Kanban-style)
// Get all board tasks
app.get('/board/tasks', (req, res) => {
  const { status, priority, assigned } = req.query;
  let tasks = boardTaskService.getAllTasks();
  
  if (status) {
    tasks = tasks.filter(t => t.status === status);
  }
  if (priority) {
    tasks = tasks.filter(t => t.priority === priority);
  }
  if (assigned === 'true') {
    tasks = tasks.filter(t => t.assignedAgent !== null);
  } else if (assigned === 'false') {
    tasks = tasks.filter(t => t.assignedAgent === null);
  }
  
  res.json(tasks.map(boardTaskService.formatTaskResponse));
});

// Get board summary
app.get('/board/summary', (req, res) => {
  const summary = boardTaskService.getBoardSummary();
  res.json(summary);
});

// Get tasks by status
app.get('/board/tasks/status/:status', (req, res) => {
  const tasks = boardTaskService.getTasksByStatus(req.params.status);
  res.json(tasks.map(boardTaskService.formatTaskResponse));
});

// Get single task
app.get('/board/tasks/:id', (req, res) => {
  const task = boardTaskService.getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(boardTaskService.formatTaskResponse(task));
});

// Create new task
app.post('/board/tasks', (req, res) => {
  const task = boardTaskService.createTask(req.body);
  logger.info(`Board task created: ${task.id} - ${task.title}`);
  res.status(201).json(boardTaskService.formatTaskResponse(task));
});

// Update task
app.put('/board/tasks/:id', (req, res) => {
  const task = boardTaskService.updateTask(req.params.id, req.body);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  logger.info(`Board task updated: ${task.id}`);
  res.json(boardTaskService.formatTaskResponse(task));
});

// Move task to a new status
app.patch('/board/tasks/:id/status', (req, res) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  const task = boardTaskService.moveTask(req.params.id, status);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  logger.info(`Board task moved: ${task.id} -> ${status}`);
  res.json(boardTaskService.formatTaskResponse(task));
});

// Assign task to agent
app.patch('/board/tasks/:id/assign', (req, res) => {
  const { agentName } = req.body;
  const task = boardTaskService.assignTask(req.params.id, agentName || null);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  logger.info(`Board task assigned: ${task.id} -> ${agentName || 'unassigned'}`);
  res.json(boardTaskService.formatTaskResponse(task));
});

// Delete task
app.delete('/board/tasks/:id', (req, res) => {
  const deleted = boardTaskService.deleteTask(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found' });
  }
  logger.info(`Board task deleted: ${req.params.id}`);
  res.json({ success: true, id: req.params.id });
});

// WebSocket connection
wss.on('connection', (ws) => {
  console.log('Client connected');

  // Send test message
  ws.send(JSON.stringify({ type: 'test', message: 'Connected to Mission Control' }));

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Start server
server.listen(config.getNumber('PORT'), () => {
  console.log(`Backend server running on port ${config.getNumber('PORT')}`);
  console.log(`Health check: http://localhost:${config.getNumber('PORT')}/health`);
  console.log(`Log level: ${config.get('LOG_LEVEL')}`);
});

// WebSocket metrics streaming
const metricsIntervalMs = 5000;
let metricsInterval = null;

if (wss) {
  const startMetricsStreaming = () => {
    if (metricsInterval) {
      clearInterval(metricsInterval);
    }

    metricsInterval = setInterval(() => {
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          try {
            const metrics = monitoring.getSystemMetrics();
            client.send(JSON.stringify({
              type: 'metrics',
              data: metrics
            }));
          } catch (error) {
            logger.error('Failed to send metrics to client', error);
          }
        }
      });
    }, metricsIntervalMs);
  };

  startMetricsStreaming();
}