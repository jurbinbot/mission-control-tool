import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Health check
export const getHealth = () => api.get('/health');

// System metrics
export const getMetrics = () => api.get('/metrics');

// Process monitoring
export const getProcesses = () => api.get('/processes');

// Alerts
export const getAlerts = () => api.get('/alerts');

// Tasks
export const getTasks = () => api.get('/tasks');

// Health checks
export const getHealthChecks = (limit = 10) => api.get(`/health-checks?limit=${limit}`);
export const getLatestHealthCheck = () => api.get('/health-checks/latest');
export const runHealthCheck = () => api.post('/health-checks/run');

// Backups
export const getBackups = () => api.get('/backups');
export const createBackup = (name = null) => api.post('/backups', { name });
export const deleteBackup = (name) => api.delete(`/backups/${name}`);
export const restoreBackup = (name) => api.post(`/backups/${name}/restore`);

// Updates
export const getUpdateStatus = () => api.get('/update/status');
export const checkForUpdates = () => api.post('/update/check');
export const performUpdate = (dryRun = false) => api.post('/update', { dryRun });
export const rollbackUpdate = (updateName) => api.post('/update/rollback', { updateName });

// OpenClaw integration
export const getOpenClawStatus = () => api.get('/openclaw/status');
export const getOpenClawHealth = () => api.get('/openclaw/health');
export const getOpenClawRuntime = () => api.get('/openclaw/runtime');
export const getOpenClawTasks = () => api.get('/openclaw/tasks');
export const getOpenClawHeartbeat = () => api.get('/openclaw/heartbeat');
export const testOpenClawConnectivity = () => api.get('/openclaw/connectivity');

// Board Task Management (Kanban-style)
export const getBoardTasks = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.priority) params.append('priority', filters.priority);
  if (filters.assigned !== undefined) params.append('assigned', filters.assigned);
  return api.get(`/board/tasks?${params.toString()}`);
};

export const getBoardSummary = () => api.get('/board/summary');

export const getTasksByStatus = (status) => api.get(`/board/tasks/status/${status}`);

export const getBoardTask = (id) => api.get(`/board/tasks/${id}`);

export const createBoardTask = (taskData) => api.post('/board/tasks', taskData);

export const updateBoardTask = (id, taskData) => api.put(`/board/tasks/${id}`, taskData);

export const moveBoardTask = (id, status) => api.patch(`/board/tasks/${id}/status`, { status });

export const assignBoardTask = (id, agentName) => api.patch(`/board/tasks/${id}/assign`, { agentName });

export const deleteBoardTask = (id) => api.delete(`/board/tasks/${id}`);

export const claimNextTask = (agentName) => api.post('/board/tasks/claim', { agentName });

export default api;