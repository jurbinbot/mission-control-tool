/**
 * Task Model
 * Defines the structure and status states for scheduled tasks
 */

/**
 * Task Status States
 */
const TaskStatus = {
  SCHEDULED: 'scheduled',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed'
};

/**
 * Task Object Format
 */
class Task {
  constructor(name, schedule, callback) {
    this.id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.name = name;
    this.schedule = schedule;
    this.callback = callback;
    this.status = TaskStatus.SCHEDULED;
    this.lastRun = null;
    this.nextRun = null;
    this.result = null;
  }

  markRunning() {
    this.status = TaskStatus.RUNNING;
    this.lastRun = new Date().toISOString();
  }

  markSuccess(result) {
    this.status = TaskStatus.SUCCESS;
    this.result = result;
  }

  markFailed(error) {
    this.status = TaskStatus.FAILED;
    this.result = error.message;
  }
}

/**
 * Task API Response Format
 */
function formatTaskResponse(task) {
  return {
    id: task.id,
    name: task.name,
    schedule: task.schedule,
    status: task.status,
    lastRun: task.lastRun,
    nextRun: task.nextRun,
    result: task.result
  };
}

module.exports = {
  Task,
  TaskStatus,
  formatTaskResponse
};