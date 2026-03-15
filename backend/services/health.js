const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Health Check Service
 * Performs routine health checks for the system
 */
class HealthService {
  constructor() {
    this.results = [];
    this.maxResults = 100;
    this.diskThreshold = config.getNumber('DISK_THRESHOLD');
  }

  /**
   * Run all health checks and return results
   */
  runAllChecks() {
    const timestamp = new Date().toISOString();
    const results = {
      timestamp,
      checks: {
        diskSpace: this.checkDiskSpace(),
        processRunning: this.checkProcessRunning(),
        endpointHealth: this.checkEndpointHealth()
      },
      status: 'ok'
    };

    // Determine overall status
    for (const [checkName, checkResult] of Object.entries(results.checks)) {
      if (checkResult.status === 'critical') {
        results.status = 'critical';
        break;
      }
      if (checkResult.status === 'warning') {
        results.status = 'warning';
      }
    }

    // Store result
    this.results.push(results);
    if (this.results.length > this.maxResults) {
      this.results = this.results.slice(-this.maxResults);
    }

    logger.info('Health checks completed', { status: results.status });
    return results;
  }

  /**
   * Check available disk space
   */
  checkDiskSpace() {
    try {
      // Get disk usage for root filesystem
      const dfOutput = execSync('df -h / 2>/dev/null || df -h .', { encoding: 'utf8' });
      const lines = dfOutput.trim().split('\n');
      
      if (lines.length < 2) {
        return {
          status: 'unknown',
          message: 'Unable to parse disk usage',
          timestamp: new Date().toISOString()
        };
      }

      // Parse df output
      const dataLine = lines[1];
      const parts = dataLine.split(/\s+/);
      
      // parts: Filesystem, Size, Used, Avail, Use%, Mounted
      const filesystem = parts[0];
      const size = parts[1];
      const used = parts[2];
      const available = parts[3];
      const usePercent = parseInt(parts[4].replace('%', ''), 10);
      const mountPoint = parts[5] || '/';

      const result = {
        status: 'ok',
        filesystem,
        size,
        used,
        available,
        usePercent,
        mountPoint,
        message: `Disk usage at ${usePercent}%`,
        timestamp: new Date().toISOString()
      };

      // Check against threshold
      if (usePercent >= 95) {
        result.status = 'critical';
        result.message = `Disk usage critical at ${usePercent}%`;
        logger.error('Disk space critical', { usePercent, filesystem });
      } else if (usePercent >= this.diskThreshold) {
        result.status = 'warning';
        result.message = `Disk usage warning at ${usePercent}%`;
        logger.warn('Disk space warning', { usePercent, filesystem });
      }

      return result;
    } catch (error) {
      logger.error('Failed to check disk space', error);
      return {
        status: 'unknown',
        message: `Disk check failed: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check if critical processes are running
   */
  checkProcessRunning() {
    try {
      const criticalProcesses = ['openclaw', 'gateway'];
      const results = [];

      for (const procName of criticalProcesses) {
        const isRunning = this.isProcessRunning(procName);
        results.push({
          name: procName,
          running: isRunning
        });
      }

      const allRunning = results.every(r => r.running);
      const someRunning = results.some(r => r.running);
      const notRunning = results.filter(r => !r.running).map(r => r.name);

      let status = 'ok';
      let message = 'All critical processes running';

      if (!someRunning) {
        status = 'critical';
        message = 'No critical processes detected';
      } else if (!allRunning) {
        status = 'warning';
        message = `Processes not running: ${notRunning.join(', ')}`;
      }

      return {
        status,
        message,
        processes: results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to check process status', error);
      return {
        status: 'unknown',
        message: `Process check failed: ${error.message}`,
        processes: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check if a process is running by name
   */
  isProcessRunning(processName) {
    try {
      // Use pgrep to find processes
      const output = execSync(`pgrep -f "${processName}" 2>/dev/null || echo ""`, {
        encoding: 'utf8',
        timeout: 5000
      });
      
      const pids = output.trim().split('\n').filter(p => p.length > 0);
      return pids.length > 0;
    } catch (error) {
      // pgrep returns non-zero if no process found
      return false;
    }
  }

  /**
   * Check health of configured endpoints
   */
  checkEndpointHealth() {
    try {
      const endpoints = this.getConfiguredEndpoints();
      
      if (endpoints.length === 0) {
        return {
          status: 'ok',
          message: 'No endpoints configured for health check',
          endpoints: [],
          timestamp: new Date().toISOString()
        };
      }

      const results = [];

      for (const endpoint of endpoints) {
        const checkResult = this.checkEndpoint(endpoint);
        results.push(checkResult);
      }

      const allHealthy = results.every(r => r.healthy);
      const unhealthyEndpoints = results.filter(r => !r.healthy).map(r => r.url);

      let status = 'ok';
      let message = 'All endpoints healthy';

      if (!allHealthy) {
        status = 'warning';
        message = `Unhealthy endpoints: ${unhealthyEndpoints.join(', ')}`;
      }

      return {
        status,
        message,
        endpoints: results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to check endpoint health', error);
      return {
        status: 'unknown',
        message: `Endpoint check failed: ${error.message}`,
        endpoints: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get configured endpoints to check
   */
  getConfiguredEndpoints() {
    // Check for configured endpoints in env
    const endpointsConfig = config.get('HEALTH_ENDPOINTS');
    
    if (endpointsConfig) {
      try {
        return JSON.parse(endpointsConfig);
      } catch (e) {
        logger.warn('Failed to parse HEALTH_ENDPOINTS config', { endpointsConfig });
      }
    }

    // Default: check local health endpoint
    const port = config.get('PORT') || '3001';
    return [
      { url: `http://localhost:${port}/health`, name: 'mission-control', timeout: 5000 }
    ];
  }

  /**
   * Check a single endpoint
   */
  checkEndpoint(endpoint) {
    const url = endpoint.url;
    const timeout = endpoint.timeout || 5000;
    const name = endpoint.name || url;

    try {
      // Use curl for endpoint check
      const curlCmd = `curl -s -o /dev/null -w "%{http_code}" --connect-timeout ${Math.ceil(timeout / 1000)} "${url}"`;
      const output = execSync(curlCmd, {
        encoding: 'utf8',
        timeout: timeout + 1000
      });

      const statusCode = parseInt(output.trim(), 10);
      const healthy = statusCode >= 200 && statusCode < 400;

      return {
        name,
        url,
        statusCode,
        healthy,
        responseTime: null, // Could parse from curl if needed
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.warn(`Endpoint check failed for ${url}`, { error: error.message });
      return {
        name,
        url,
        statusCode: 0,
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get stored health check results
   */
  getResults(limit = 10) {
    return this.results.slice(-limit);
  }

  /**
   * Get latest health check result
   */
  getLatestResult() {
    return this.results.length > 0 ? this.results[this.results.length - 1] : null;
  }

  /**
   * Clear stored results
   */
  clearResults() {
    this.results = [];
    logger.info('Health check results cleared');
  }
}

module.exports = new HealthService();