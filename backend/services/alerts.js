const monitoring = require('./monitoring');
const processService = require('./process');
const config = require('../config');
const logger = require('../utils/logger');

class AlertService {
  constructor() {
    this.alerts = [];
    this.cpuThreshold = config.getNumber('CPU_THRESHOLD');
    this.memoryThreshold = config.getNumber('MEMORY_THRESHOLD');
    this.diskThreshold = config.getNumber('DISK_THRESHOLD');
    this.alertHistory = new Map();
  }

  checkSystemMetrics() {
    try {
      const metrics = monitoring.getSystemMetrics();

      this.checkCpuThreshold(metrics.cpuUsage.percent);
      this.checkMemoryThreshold(metrics.memoryUsage.percent);
      this.checkDiskThreshold(metrics.diskUsage.percent);

      return this.alerts;
    } catch (error) {
      logger.error('Failed to check system metrics', error);
      return this.alerts;
    }
  }

  checkCpuThreshold(cpuPercent) {
    if (cpuPercent >= this.cpuThreshold) {
      const alertId = `cpu-${Date.now()}`;
      const alert = {
        id: alertId,
        type: 'CPU_USAGE_HIGH',
        severity: 'warning',
        message: `CPU usage is at ${cpuPercent}% (threshold: ${this.cpuThreshold}%)`,
        timestamp: new Date().toISOString(),
        data: { cpuUsage: cpuPercent }
      };

      if (!this.alertHistory.has(alertId)) {
        this.alerts.push(alert);
        this.alertHistory.set(alertId, { count: 1, firstSeen: new Date() });
        logger.warn('CPU usage high alert triggered', { cpuUsage: cpuPercent });
      } else {
        const history = this.alertHistory.get(alertId);
        history.count++;
        if (history.count >= 5) {
          // Only log periodically
          logger.info('CPU usage still high', { cpuUsage: cpuPercent, count: history.count });
        }
      }
    }
  }

  checkMemoryThreshold(memoryPercent) {
    if (memoryPercent >= this.memoryThreshold) {
      const alertId = `memory-${Date.now()}`;
      const alert = {
        id: alertId,
        type: 'MEMORY_USAGE_HIGH',
        severity: 'warning',
        message: `Memory usage is at ${memoryPercent}% (threshold: ${this.memoryThreshold}%)`,
        timestamp: new Date().toISOString(),
        data: { memoryUsage: memoryPercent }
      };

      if (!this.alertHistory.has(alertId)) {
        this.alerts.push(alert);
        this.alertHistory.set(alertId, { count: 1, firstSeen: new Date() });
        logger.warn('Memory usage high alert triggered', { memoryUsage: memoryPercent });
      } else {
        const history = this.alertHistory.get(alertId);
        history.count++;
      }
    }
  }

  checkDiskThreshold(diskPercent) {
    if (diskPercent >= this.diskThreshold) {
      const alertId = `disk-${Date.now()}`;
      const alert = {
        id: alertId,
        type: 'DISK_USAGE_HIGH',
        severity: 'warning',
        message: `Disk usage is at ${diskPercent}% (threshold: ${this.diskThreshold}%)`,
        timestamp: new Date().toISOString(),
        data: { diskUsage: diskPercent }
      };

      if (!this.alertHistory.has(alertId)) {
        this.alerts.push(alert);
        this.alertHistory.set(alertId, { count: 1, firstSeen: new Date() });
        logger.warn('Disk usage high alert triggered', { diskUsage: diskPercent });
      } else {
        const history = this.alertHistory.get(alertId);
        history.count++;
      }
    }
  }

  checkProcessStatus() {
    try {
      const openclawProcesses = processService.getOpenclawProcesses();
      const totalProcesses = processService.getAllProcesses().length;

      if (totalProcesses === 0) {
        const alertId = 'no-processes';
        const alert = {
          id: alertId,
          type: 'NO_PROCESSES',
          severity: 'critical',
          message: 'No processes detected on the system',
          timestamp: new Date().toISOString(),
          data: { openclawProcesses: 0, totalProcesses: 0 }
        };

        if (!this.alertHistory.has(alertId)) {
          this.alerts.push(alert);
          this.alertHistory.set(alertId, { count: 1, firstSeen: new Date() });
          logger.warn('No processes detected alert triggered');
        }
      }

      // Check for specific OpenClaw processes
      if (openclawProcesses.length === 0) {
        const alertId = 'no-openclaw-processes';
        const alert = {
          id: alertId,
          type: 'NO_OPENCLAW_PROCESSES',
          severity: 'warning',
          message: 'No OpenClaw processes detected',
          timestamp: new Date().toISOString(),
          data: { openclawProcesses: 0, totalProcesses }
        };

        if (!this.alertHistory.has(alertId)) {
          this.alerts.push(alert);
          this.alertHistory.set(alertId, { count: 1, firstSeen: new Date() });
          logger.warn('No OpenClaw processes detected');
        }
      }
    } catch (error) {
      logger.error('Failed to check process status', error);
    }
  }

  getAllAlerts() {
    // Get current system metrics and check for alerts
    this.checkSystemMetrics();
    this.checkProcessStatus();

    return this.alerts.slice(-50); // Return last 50 alerts
  }

  clearAlerts() {
    this.alerts = [];
    this.alertHistory.clear();
    logger.info('Alerts cleared');
  }
}

module.exports = new AlertService();