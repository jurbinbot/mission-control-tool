const config = require('../config');
const logger = require('../utils/logger');
const { Task, formatTaskResponse } = require('../models/task');

class Scheduler {
  constructor() {
    this.tasks = new Map();
    this.timer = null;
    this.isRunning = false;
  }

  addTask(name, schedule, callback) {
    const task = new Task(name, schedule, callback);
    this.tasks.set(name, task);
    logger.info(`Task added: ${name} with schedule: ${schedule}`);
    return task;
  }

  start() {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Scheduler started');

    // Check if any task needs to run immediately
    this.checkTasks();

    // Start periodic checks
    this.startTimer();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    logger.info('Scheduler stopped');
  }

  startTimer() {
    // Check tasks every minute
    this.timer = setInterval(() => {
      this.checkTasks();
    }, 60000);
  }

  checkTasks() {
    const now = new Date();

    for (const [name, task] of this.tasks.entries()) {
      const shouldRun = this.shouldRunTask(task, now);

      if (shouldRun) {
        this.executeTask(task);
      }
    }
  }

  shouldRunTask(task, now) {
    if (task.status === 'running') {
      return false;
    }

    // If this is the first run, execute immediately
    if (task.lastRun === null) {
      return true;
    }

    // Calculate next run time
    const cron = this.parseCron(task.schedule);
    const lastRun = new Date(task.lastRun);
    let nextRun = new Date(lastRun);

    switch (cron.unit) {
      case 'minute':
        nextRun.setMinutes(nextRun.getMinutes() + cron.value);
        break;
      case 'hour':
        nextRun.setHours(nextRun.getHours() + cron.value);
        break;
      case 'day':
        nextRun.setDate(nextRun.getDate() + cron.value);
        break;
      case 'month':
        nextRun.setMonth(nextRun.getMonth() + cron.value);
        break;
    }

    return now >= nextRun;
  }

  parseCron(schedule) {
    // Simple cron parser: "0 0 * * *" or "0 3 * * *"
    const parts = schedule.split(' ').map(p => parseInt(p));
    if (parts.length === 5) {
      // Standard cron: minute hour day month weekday
      return {
        unit: 'minute',
        value: parts[0]
      };
    }

    // Simplified format: "0 * * *" means hourly
    if (parts.length === 4) {
      return {
        unit: 'minute',
        value: parts[0]
      };
    }

    // Default to hourly
    return {
      unit: 'minute',
      value: 0
    };
  }

  async executeTask(task) {
    task.markRunning();

    try {
      logger.info(`Executing task: ${task.name}`);
      const result = await task.callback();
      task.markSuccess(result);
      logger.info(`Task completed: ${task.name}`, { result });
    } catch (error) {
      task.markFailed(error);
      logger.error(`Task failed: ${task.name}`, error);
    }
  }

  getTasks() {
    return Array.from(this.tasks.values()).map(task => formatTaskResponse(task));
  }

  getTask(name) {
    return this.tasks.get(name);
  }

  deleteTask(name) {
    const task = this.tasks.get(name);
    if (task) {
      this.tasks.delete(name);
      logger.info(`Task deleted: ${name}`);
      return task;
    }
    return null;
  }
}

module.exports = new Scheduler();