const os = require('os');
const logger = require('../utils/logger');

class MonitoringService {
  constructor() {
    this.startTime = Date.now();
  }

  getSystemMetrics() {
    const now = Date.now();
    const uptime = now - this.startTime;

    // CPU usage
    const cpuUsage = this.getCpuUsage();

    // Memory usage
    const memoryUsage = this.getMemoryUsage();

    // Disk usage
    const diskUsage = this.getDiskUsage();

    return {
      cpuUsage,
      memoryUsage,
      diskUsage,
      uptime,
      timestamp: new Date().toISOString()
    };
  }

  getCpuUsage() {
    try {
      const totalCpus = os.cpus().length;
      const totalIdle = os.cpus().reduce((acc, cpu) => acc + cpu.times.idle, 0);
      const totalUser = os.cpus().reduce((acc, cpu) => acc + cpu.times.user, 0);
      const totalSystem = os.cpus().reduce((acc, cpu) => acc + cpu.times.sys, 0);
      const totalNice = os.cpus().reduce((acc, cpu) => acc + cpu.times.nice, 0);

      const idlePercent = (totalIdle / (totalIdle + totalUser + totalSystem + totalNice)) * 100;
      const usagePercent = Math.max(0, 100 - idlePercent);

      return {
        percent: parseFloat(usagePercent.toFixed(1)),
        count: totalCpus
      };
    } catch (error) {
      logger.error('Failed to get CPU usage', error);
      return { percent: 0, count: 0 };
    }
  }

  getMemoryUsage() {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const usagePercent = (usedMem / totalMem) * 100;

      return {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        percent: parseFloat(usagePercent.toFixed(1))
      };
    } catch (error) {
      logger.error('Failed to get memory usage', error);
      return { total: 0, free: 0, used: 0, percent: 0 };
    }
  }

  getDiskUsage() {
    try {
      const totalDisk = os.totalmem();
      const freeDisk = os.freemem();
      const usedDisk = totalDisk - freeDisk;
      const usagePercent = (usedDisk / totalDisk) * 100;

      return {
        total: totalDisk,
        free: freeDisk,
        used: usedDisk,
        percent: parseFloat(usagePercent.toFixed(1)),
        units: 'bytes'
      };
    } catch (error) {
      logger.error('Failed to get disk usage', error);
      return { total: 0, free: 0, used: 0, percent: 0, units: 'bytes' };
    }
  }

  getProcessMetrics() {
    try {
      const processes = process.memoryUsage();
      const uptime = process.uptime();

      return {
        processCpu: process.cpuUsage ? process.cpuUsage() : { user: 0, system: 0 },
        processMemory: processes,
        uptime: Math.floor(uptime)
      };
    } catch (error) {
      logger.error('Failed to get process metrics', error);
      return { processCpu: { user: 0, system: 0 }, processMemory: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 }, uptime: 0 };
    }
  }
}

module.exports = new MonitoringService();