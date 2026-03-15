const os = require('os');
const { execSync } = require('child_process');
const http = require('http');
const logger = require('../utils/logger');
const config = require('../config');

class ProcessService {
  constructor() {
    this.openclawKeywords = ['openclaw', 'gateway', 'agent'];
    this.gatewayHost = config.get('OPENCLAW_GATEWAY_HOST') || '127.0.0.1';
    this.gatewayPort = config.getNumber('OPENCLAW_GATEWAY_PORT') || 18789;
  }

  /**
   * Check if running inside a container
   */
  _isContainer() {
    try {
      const fs = require('fs');

      // Check for container environment files
      if (fs.existsSync('/.dockerenv') || fs.existsSync('/.dockerinit')) {
        return true;
      }

      // Check cgroup for container signatures (works for cgroup v1)
      try {
        const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
        if (cgroup.includes('docker') || cgroup.includes('podman') || cgroup.includes('containerd')) {
          return true;
        }
      } catch (e) {
        // Ignore
      }

      // Check for container environment variable (set by Podman/Docker)
      if (process.env.container || process.env.CONTAINER) {
        return true;
      }

      // Check if running as PID 1 (typical in containers)
      // This is a heuristic - if we're PID 1 and have limited processes, we're likely in a container
      try {
        const output = execSync('ps 2>/dev/null | wc -l', { encoding: 'utf8', timeout: 2000 });
        const processCount = parseInt(output.trim());
        // If we see fewer than 10 processes and we're PID 1, we're in a container
        if (processCount < 10 && process.pid === 1) {
          return true;
        }
      } catch (e) {
        // Ignore
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fetch OpenClaw status from Gateway API
   */
  _fetchGatewayStatus() {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: this.gatewayHost,
        port: this.gatewayPort,
        path: '/health',
        method: 'GET',
        timeout: 3000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
      req.end();
    });
  }

  /**
   * Get OpenClaw processes via Gateway API (works from containers)
   */
  _getOpenclawViaGateway() {
    try {
      const result = execSync(
        `curl -s -m 2 http://${this.gatewayHost}:${this.gatewayPort}/health 2>/dev/null || echo '{"ok":false}'`,
        { encoding: 'utf8', timeout: 5000 }
      );

      const data = JSON.parse(result);
      if (data.ok || data.status === 'live') {
        // Gateway is running - create a synthetic process entry
        return [{
          pid: 'gateway',
          name: 'openclaw-gateway',
          cpu: { percent: 0 },
          memory: { percent: 0 },
          source: 'gateway-api',
          status: 'running',
          uptime: data.uptime || 'unknown'
        }];
      }
      return [];
    } catch (error) {
      // Gateway not reachable
      return [];
    }
  }

  getAllProcesses() {
    try {
      const processes = [];
      const inContainer = this._isContainer();

      // Always check Gateway for OpenClaw processes (works from container and host)
      const gatewayProcs = this._getOpenclawViaGateway();
      processes.push(...gatewayProcs);

      if (inContainer) {
        // Also get container-local processes (BusyBox ps)
        try {
          const output = execSync('ps 2>/dev/null', { encoding: 'utf8', timeout: 5000 });
          const lines = output.trim().split('\n').slice(1); // Skip header
          for (const line of lines) {
            if (!line.trim()) continue;
            const parts = line.trim().split(/\s+/);
            // BusyBox ps: PID USER TIME COMMAND
            if (parts.length >= 4) {
              const pid = parseInt(parts[0]);
              const command = parts[parts.length - 1]; // Last column is COMMAND
              const name = command.split('/')[0].split(' ')[0]; // Get base command name
              processes.push({
                pid,
                name,
                command,
                cpu: { percent: 0 },
                memory: { percent: 0 },
                source: 'ps-busybox'
              });
            }
          }
        } catch (e) {
          // ps may not be available in minimal containers
          logger.error('Failed to get processes via ps in container', e);
        }
      } else {
        // On host: use ps for all processes
        try {
          let output;
          try {
            output = execSync(
              'ps -e -o pid=,comm=,pcpu=,pmem=,etime= --no-headers 2>/dev/null',
              { encoding: 'utf8', timeout: 5000 }
            );
          } catch (e) {
            output = execSync('ps -e 2>/dev/null', { encoding: 'utf8', timeout: 5000 });
          }

          const lines = output.trim().split('\n');
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
              const pid = parseInt(parts[0]);
              const name = parts[parts.length >= 5 ? 1 : parts.length - 1];
              const cpu = parts.length >= 4 ? parseFloat(parts[2]) || 0 : 0;
              const mem = parts.length >= 4 ? parseFloat(parts[3]) || 0 : 0;

              if (!isNaN(pid) && name) {
                processes.push({
                  pid,
                  name,
                  cpu: { percent: cpu },
                  memory: { percent: mem },
                  source: 'ps-host'
                });
              }
            }
          }
        } catch (e) {
          logger.error('Failed to get processes via ps', e);
        }
      }

      return processes;
    } catch (error) {
      logger.error('Failed to get all processes', error);
      return [];
    }
  }

  getOpenclawProcesses() {
    const allProcesses = this.getAllProcesses();
    return allProcesses.filter(p => this.isOpenclawProcess(p));
  }

  isOpenclawProcess(proc) {
    if (!proc || !proc.name) {
      return false;
    }

    const name = proc.name.toLowerCase();
    return this.openclawKeywords.some(keyword => name.includes(keyword));
  }

  getProcessSummary() {
    try {
      const processes = this.getAllProcesses();
      const openclawProcesses = this.getOpenclawProcesses();

      const totalCpu = processes.reduce((sum, p) => sum + (p.cpu?.percent || 0), 0);
      const totalMemory = processes.reduce((sum, p) => sum + (p.memory?.percent || 0), 0);

      return {
        totalProcesses: processes.length,
        openclawProcesses: openclawProcesses.length,
        totalCpuPercent: parseFloat(totalCpu.toFixed(1)),
        totalMemoryPercent: parseFloat(totalMemory.toFixed(1)),
        avgCpuPerProcess: processes.length > 0 ? parseFloat((totalCpu / processes.length).toFixed(1)) : 0
      };
    } catch (error) {
      logger.error('Failed to get process summary', error);
      return {
        totalProcesses: 0,
        openclawProcesses: 0,
        totalCpuPercent: 0,
        totalMemoryPercent: 0,
        avgCpuPerProcess: 0
      };
    }
  }

  /**
   * Async method to refresh gateway status cache
   * Call this periodically from the server startup
   */
  async refreshGatewayCache() {
    await this._refreshGatewayStatus();
    return this._gatewayStatusCache;
  }
}

module.exports = new ProcessService();