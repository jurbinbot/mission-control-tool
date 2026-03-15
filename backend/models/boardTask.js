/**
 * Board Task Model
 * Kanban-style task management for OpenClaw agents
 */

/**
 * Board Task Status States
 */
const BoardTaskStatus = {
  BACKLOG: 'backlog',
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  COMPLETE: 'complete'
};

/**
 * Board Task Priority
 */
const BoardTaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * In-memory storage for board tasks
 */
let tasks = [];
let taskIdCounter = 1;

/**
 * Board Task Object Format
 */
class BoardTask {
  constructor(data) {
    this.id = `bt-${Date.now()}-${taskIdCounter++}`;
    this.title = data.title || 'Untitled Task';
    this.description = data.description || '';
    this.status = data.status || BoardTaskStatus.BACKLOG;
    this.priority = data.priority || BoardTaskPriority.MEDIUM;
    this.assignedAgent = data.assignedAgent || null;
    this.labels = data.labels || [];
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    this.completedAt = null;
    this.metadata = data.metadata || {};
  }

  update(data) {
    if (data.title !== undefined) this.title = data.title;
    if (data.description !== undefined) this.description = data.description;
    if (data.status !== undefined) {
      const oldStatus = this.status;
      this.status = data.status;
      if (data.status === BoardTaskStatus.COMPLETE && oldStatus !== BoardTaskStatus.COMPLETE) {
        this.completedAt = new Date().toISOString();
      }
      if (data.status !== BoardTaskStatus.COMPLETE) {
        this.completedAt = null;
      }
    }
    if (data.priority !== undefined) this.priority = data.priority;
    if (data.assignedAgent !== undefined) this.assignedAgent = data.assignedAgent;
    if (data.labels !== undefined) this.labels = data.labels;
    if (data.metadata !== undefined) this.metadata = { ...this.metadata, ...data.metadata };
    this.updatedAt = new Date().toISOString();
    return this;
  }
}

/**
 * Create a new board task
 */
function createTask(data) {
  const task = new BoardTask(data);
  tasks.push(task);
  return task;
}

/**
 * Get all tasks
 */
function getAllTasks() {
  return [...tasks];
}

/**
 * Get tasks by status
 */
function getTasksByStatus(status) {
  return tasks.filter(t => t.status === status);
}

/**
 * Get task by ID
 */
function getTaskById(id) {
  return tasks.find(t => t.id === id);
}

/**
 * Update task
 */
function updateTask(id, data) {
  const task = getTaskById(id);
  if (!task) return null;
  return task.update(data);
}

/**
 * Delete task
 */
function deleteTask(id) {
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return false;
  tasks.splice(index, 1);
  return true;
}

/**
 * Move task to a new status (convenience method)
 */
function moveTask(id, newStatus) {
  return updateTask(id, { status: newStatus });
}

/**
 * Assign task to an agent
 */
function assignTask(id, agentName) {
  return updateTask(id, { assignedAgent: agentName });
}

/**
 * Clear all tasks (useful for testing/reset)
 */
function clearAllTasks() {
  tasks = [];
  taskIdCounter = 1;
}

/**
 * Format task for API response
 */
function formatTaskResponse(task) {
  if (!task) return null;
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assignedAgent: task.assignedAgent,
    labels: task.labels,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt,
    metadata: task.metadata
  };
}

/**
 * Get board summary
 */
function getBoardSummary() {
  const summary = {
    total: tasks.length,
    byStatus: {},
    byPriority: {},
    unassigned: 0,
    assigned: 0
  };

  Object.values(BoardTaskStatus).forEach(status => {
    summary.byStatus[status] = tasks.filter(t => t.status === status).length;
  });

  Object.values(BoardTaskPriority).forEach(priority => {
    summary.byPriority[priority] = tasks.filter(t => t.priority === priority).length;
  });

  summary.unassigned = tasks.filter(t => !t.assignedAgent).length;
  summary.assigned = tasks.filter(t => t.assignedAgent).length;

  return summary;
}

module.exports = {
  BoardTask,
  BoardTaskStatus,
  BoardTaskPriority,
  createTask,
  getAllTasks,
  getTasksByStatus,
  getTaskById,
  updateTask,
  deleteTask,
  moveTask,
  assignTask,
  clearAllTasks,
  formatTaskResponse,
  getBoardSummary
};