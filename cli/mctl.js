#!/usr/bin/env node

const { program } = require('commander');
const axios = require('axios');

const API_BASE_URL = process.env.MISSION_CONTROL_API_URL || 'http://localhost:4432';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

// Helper to format JSON output
const formatOutput = (data) => {
  if (process.env.OUTPUT_FORMAT === 'json') {
    return JSON.stringify(data, null, 2);
  }
  return data;
};

// Helper for API error handling
const handleApiError = (error) => {
  if (error.code === 'ECONNREFUSED') {
    console.error('Error: Cannot connect to Mission Control backend at', API_BASE_URL);
    console.error('Make sure the backend is running.');
  } else if (error.response) {
    console.error(`Error ${error.response.status}: ${error.response.data?.message || error.response.statusText}`);
  } else {
    console.error('Error:', error.message);
  }
  process.exit(1);
};

program
  .name('mctl')
  .description('Mission Control CLI - Monitor and manage OpenClaw deployments')
  .version('1.0.0')
  .option('-j, --json', 'Output in JSON format')
  .option('-u, --url <url>', 'API URL', API_BASE_URL);

// Status command
program
  .command('status')
  .description('Show overall system status')
  .action(async () => {
    try {
      const [healthRes, metricsRes, openclawRes] = await Promise.all([
        api.get('/health'),
        api.get('/metrics'),
        api.get('/openclaw/health')
      ]);

      if (program.opts().json) {
        console.log(JSON.stringify({
          health: healthRes.data,
          metrics: metricsRes.data,
          openclaw: openclawRes.data
        }, null, 2));
        return;
      }

      console.log('\n╔══════════════════════════════════════════╗');
      console.log('║       MISSION CONTROL STATUS             ║');
      console.log('╚══════════════════════════════════════════╝\n');

      // Backend status
      console.log('Backend Status: ✓ Connected');
      console.log(`API URL: ${API_BASE_URL}`);
      console.log('');

      // System metrics
      console.log('--- System Metrics ---');
      console.log(`CPU Usage:    ${metricsRes.data.cpuUsage?.percent || 0}%`);
      console.log(`Memory Usage: ${metricsRes.data.memoryUsage?.percent || 0}%`);
      console.log(`Disk Usage:   ${metricsRes.data.diskUsage?.percent || 0}%`);
      console.log('');

      // OpenClaw status
      console.log('--- OpenClaw ---');
      if (openclawRes.data.healthy) {
        console.log(`Status: ✓ Running (v${openclawRes.data.version || 'unknown'})`);
        console.log(`Sessions: ${openclawRes.data.sessionCount || 0}`);
      } else {
        console.log(`Status: ✗ ${openclawRes.data.reason || 'Not available'}`);
      }

      // Alerts
      if (metricsRes.data.alerts && metricsRes.data.alerts.length > 0) {
        console.log('');
        console.log('--- Active Alerts ---');
        metricsRes.data.alerts.slice(-5).forEach(alert => {
          const icon = alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟡' : '⚪';
          console.log(`${icon} [${alert.type}] ${alert.message}`);
        });
      }

      console.log('');
    } catch (error) {
      handleApiError(error);
    }
  });

// Metrics command
program
  .command('metrics')
  .description('Show detailed system metrics')
  .option('-w, --watch', 'Watch metrics in real-time')
  .action(async (options) => {
    try {
      if (options.watch) {
        console.log('Watching metrics (press Ctrl+C to stop)...\n');
        const fetchAndDisplay = async () => {
          const res = await api.get('/metrics');
          const m = res.data;
          const timestamp = new Date().toLocaleTimeString();
          console.log(`[${timestamp}] CPU: ${m.cpuUsage?.percent || 0}% | Memory: ${m.memoryUsage?.percent || 0}% | Disk: ${m.diskUsage?.percent || 0}%`);
        };
        await fetchAndDisplay();
        setInterval(fetchAndDisplay, 5000);
      } else {
        const res = await api.get('/metrics');
        const m = res.data;

        if (program.opts().json) {
          console.log(JSON.stringify(m, null, 2));
          return;
        }

        console.log('\n--- System Metrics ---');
        console.log(`Timestamp: ${m.timestamp}`);
        console.log('');
        console.log(`CPU Usage:    ${m.cpuUsage?.percent || 0}% (${m.cpuUsage?.count || 0} cores)`);
        console.log(`Memory Usage: ${m.memoryUsage?.percent || 0}% (${formatBytes(m.memoryUsage?.used)} / ${formatBytes(m.memoryUsage?.total)})`);
        console.log(`Disk Usage:   ${m.diskUsage?.percent || 0}% (${formatBytes(m.diskUsage?.used)} / ${formatBytes(m.diskUsage?.total)})`);
        console.log(`Uptime:       ${formatUptime(m.uptime)}`);
        console.log('');
      }
    } catch (error) {
      handleApiError(error);
    }
  });

// Alerts command
program
  .command('alerts')
  .description('Show active alerts')
  .option('-a, --all', 'Show all alerts (not just recent)')
  .action(async (options) => {
    try {
      const res = await api.get('/alerts');
      const alerts = options.all ? res.data : res.data.slice(-10);

      if (program.opts().json) {
        console.log(JSON.stringify(alerts, null, 2));
        return;
      }

      if (alerts.length === 0) {
        console.log('No active alerts');
        return;
      }

      console.log('\n--- Active Alerts ---\n');
      alerts.forEach((alert, index) => {
        const icon = alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟡' : '⚪';
        console.log(`${icon} [${alert.type}] ${alert.severity.toUpperCase()}`);
        console.log(`   ${alert.message}`);
        console.log(`   ${alert.timestamp}`);
        console.log('');
      });

      console.log(`Total: ${alerts.length} alerts`);
    } catch (error) {
      handleApiError(error);
    }
  });

// Processes command
program
  .command('processes')
  .description('Show process monitoring data')
  .action(async () => {
    try {
      const res = await api.get('/processes');

      if (program.opts().json) {
        console.log(JSON.stringify(res.data, null, 2));
        return;
      }

      console.log('\n--- Process Summary ---\n');
      console.log(`Total Processes: ${res.data.length || 0}`);
      console.log('');
      console.log('Processes:');
      res.data.slice(0, 10).forEach(p => {
        console.log(`  ${p.name} (PID: ${p.pid}) - CPU: ${p.cpu?.user || 0}us - Memory: ${formatBytes(p.memory?.rss)}`);
      });

      if (res.data.length > 10) {
        console.log(`  ... and ${res.data.length - 10} more`);
      }
      console.log('');
    } catch (error) {
      handleApiError(error);
    }
  });

// OpenClaw command
program
  .command('openclaw')
  .description('Show OpenClaw integration status')
  .action(async () => {
    try {
      const res = await api.get('/openclaw/status');

      if (program.opts().json) {
        console.log(JSON.stringify(res.data, null, 2));
        return;
      }

      if (!res.data.success) {
        console.log('OpenClaw Status: ✗ Not available');
        console.log(`Error: ${res.data.error}`);
        return;
      }

      const status = res.data.status;

      console.log('\n--- OpenClaw Status ---\n');
      console.log(`Version: ${status.runtime?.version || 'unknown'}`);
      console.log(`Platform: ${status.system?.platform || 'unknown'} ${status.system?.arch || ''}`);
      console.log(`Hostname: ${status.system?.hostname || 'unknown'}`);
      console.log('');

      // Heartbeat info
      if (status.heartbeat) {
        console.log('Heartbeat:');
        console.log(`  Default Agent: ${status.heartbeat.defaultAgentId || 'none'}`);
        if (status.heartbeat.agents && status.heartbeat.agents.length > 0) {
          status.heartbeat.agents.forEach(a => {
            console.log(`  - ${a.agentId}: ${a.enabled ? 'enabled' : 'disabled'} (${a.interval})`);
          });
        }
        console.log('');
      }

      // Session info
      if (status.sessions) {
        console.log('Sessions:');
        console.log(`  Count: ${status.sessions.count || 0}`);
        if (status.sessions.recent && status.sessions.recent.length > 0) {
          console.log('  Recent:');
          status.sessions.recent.slice(0, 3).forEach(s => {
            console.log(`    - ${s.agentId} (${s.model}): ${s.percentUsed}% context used`);
          });
        }
        console.log('');
      }

      // Channels
      if (status.channels && status.channels.length > 0) {
        console.log('Channels:');
        status.channels.forEach(c => {
          const icon = c.healthy ? '✓' : '✗';
          console.log(`  ${icon} ${c.provider}: ${c.status}`);
        });
        console.log('');
      }
    } catch (error) {
      handleApiError(error);
    }
  });

// Tasks command
program
  .command('tasks')
  .description('Show scheduled tasks status')
  .action(async () => {
    try {
      const res = await api.get('/tasks');

      if (program.opts().json) {
        console.log(JSON.stringify(res.data, null, 2));
        return;
      }

      console.log('\n--- Scheduled Tasks ---\n');

      if (res.data.length === 0) {
        console.log('No scheduled tasks');
        return;
      }

      res.data.forEach(task => {
        const statusIcon = task.status === 'success' ? '✓' : task.status === 'running' ? '⏳' : task.status === 'failed' ? '✗' : '○';
        console.log(`${statusIcon} ${task.name}`);
        console.log(`   Schedule: ${task.schedule}`);
        console.log(`   Status: ${task.status}`);
        if (task.lastRun) {
          console.log(`   Last Run: ${task.lastRun}`);
        }
        if (task.nextRun) {
          console.log(`   Next Run: ${task.nextRun}`);
        }
        console.log('');
      });
    } catch (error) {
      handleApiError(error);
    }
  });

// Health-checks command
program
  .command('health-checks')
  .description('Show health check results')
  .option('-r, --run', 'Run health checks before showing results')
  .action(async (options) => {
    try {
      if (options.run) {
        console.log('Running health checks...');
        await api.post('/health-checks/run');
        console.log('Health checks completed.\n');
      }

      const res = await api.get('/health-checks/latest');

      if (program.opts().json) {
        console.log(JSON.stringify(res.data, null, 2));
        return;
      }

      if (res.data.status === 'no-results') {
        console.log('No health checks have been run yet. Use --run to run checks.');
        return;
      }

      const result = res.data;

      console.log('\n--- Health Check Results ---\n');
      console.log(`Timestamp: ${result.timestamp}`);
      console.log(`Overall Status: ${result.status.toUpperCase()}`);
      console.log('');

      // Disk space
      if (result.checks?.diskSpace) {
        const disk = result.checks.diskSpace;
        const icon = disk.status === 'ok' ? '✓' : disk.status === 'warning' ? '⚠' : '✗';
        console.log(`${icon} Disk Space: ${disk.usePercent}% used (${disk.message})`);
      }

      // Processes
      if (result.checks?.processRunning) {
        const proc = result.checks.processRunning;
        const icon = proc.status === 'ok' ? '✓' : proc.status === 'warning' ? '⚠' : '✗';
        console.log(`${icon} Processes: ${proc.message}`);
      }

      // Endpoints
      if (result.checks?.endpointHealth) {
        const ep = result.checks.endpointHealth;
        const icon = ep.status === 'ok' ? '✓' : ep.status === 'warning' ? '⚠' : '✗';
        console.log(`${icon} Endpoints: ${ep.message}`);
      }

      console.log('');
    } catch (error) {
      handleApiError(error);
    }
  });

// Utility functions
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatUptime(ms) {
  if (!ms) return '0s';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

program.parse();