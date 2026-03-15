const { execSync } = require('child_process');
const http = require('http');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * OpenClaw Integration Service
 * Integrates with OpenClaw Gateway API to fetch status and task information
 * Falls back to CLI when available
 */
class OpenClawService {
  constructor() {
    this.timeout = config.getNumber('OPENCLAW_API_TIMEOUT') || 5000;
    this.gatewayHost = config.get('OPENCLAW_GATEWAY_HOST') || '127.0.0.1';
    this.gatewayPort = config.getNumber('OPENCLAW_GATEWAY_PORT') || 18789;
    this.lastStatus = null;
    this.lastError = null;
    this.connected = false;
    this._statusCache = null;
    this._cacheTime = 0;
    this._cacheTTL = 3000; // 3 seconds
  }

  /**
   * Get cached status or fetch new
   */
  _getCachedStatus() {
    const now = Date.now();
    if (this._statusCache && (now - this._cacheTime) < this._cacheTTL) {
      return this._statusCache;
    }
    return null;
  }

  /**
   * Test connectivity to OpenClaw Gateway API (sync wrapper)
   */
  testConnectivity() {
    const cached = this._getCachedStatus();
    if (cached && cached.connectivity) {
      return cached.connectivity;
    }

    // Try Gateway API via curl
    try {
      const result = execSync(
        `curl -s -m 3 http://${this.gatewayHost}:${this.gatewayPort}/health 2>/dev/null || echo '{"error":"timeout"}'`,
        { encoding: 'utf8', timeout: 5000 }
      );

      const data = JSON.parse(result);
      if (data.error) {
        throw new Error(data.error);
      }

      this.connected = true;
      this.lastError = null;

      const connectivity = {
        connected: true,
        method: 'gateway-api',
        gateway: `http://${this.gatewayHost}:${this.gatewayPort}`,
        version: data.version || 'unknown',
        timestamp: new Date().toISOString()
      };

      // Cache the result
      this._statusCache = { connected: true, connectivity };
      this._cacheTime = Date.now();

      return connectivity;
    } catch (gatewayError) {
      // Fallback to CLI
      try {
        const output = execSync('openclaw --version', {
          encoding: 'utf8',
          timeout: 3000
        });

        this.connected = true;
        this.lastError = null;

        const versionMatch = output.match(/OpenClaw\s+(\d+\.\d+\.\d+)/);
        const version = versionMatch ? versionMatch[1] : 'unknown';

        return {
          connected: true,
          method: 'cli',
          version,
          timestamp: new Date().toISOString()
        };
      } catch (cliError) {
        this.connected = false;
        this.lastError = `Gateway: ${gatewayError.message}; CLI: ${cliError.message}`;

        return {
          connected: false,
          error: this.lastError,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  /**
   * Fetch OpenClaw status (sync wrapper)
   */
  fetchStatus() {
    const cached = this._getCachedStatus();
    if (cached && cached.status) {
      return { success: true, status: cached.status, method: 'cached' };
    }

    // Try Gateway API
    try {
      const result = execSync(
        `curl -s -m 3 http://${this.gatewayHost}:${this.gatewayPort}/health 2>/dev/null || echo '{"error":"timeout"}'`,
        { encoding: 'utf8', timeout: 5000 }
      );

      const data = JSON.parse(result);
      if (data.error) {
        throw new Error(data.error);
      }

      const status = {
        runtime: { version: data.version || 'unknown' },
        gateway: { running: true, uptime: data.uptime || 0 },
        system: { platform: data.platform || 'unknown', arch: data.arch || 'unknown' }
      };

      this.lastStatus = status;
      this.connected = true;
      this.lastError = null;

      // Cache the result
      this._statusCache = { connected: true, status, connectivity: { connected: true, method: 'gateway-api' } };
      this._cacheTime = Date.now();

      return { success: true, status, method: 'gateway-api' };
    } catch (gatewayError) {
      // Fallback to CLI
      try {
        const output = execSync(`openclaw status --json --timeout ${this.timeout}`, {
          encoding: 'utf8',
          timeout: this.timeout + 2000
        });

        const status = JSON.parse(output);
        this.lastStatus = status;
        this.connected = true;
        this.lastError = null;

        return { success: true, status: this.parseStatus(status), method: 'cli' };
      } catch (cliError) {
        this.connected = false;
        this.lastError = cliError.message;

        return { success: false, error: cliError.message, method: 'none' };
      }
    }
  }

  /**
   * Parse CLI status output into simplified format
   */
  parseStatus(status) {
    const parsed = {
      runtime: { version: status.runtimeVersion || 'unknown' },
      heartbeat: null,
      sessions: null,
      channels: [],
      system: null
    };

    if (status.heartbeat) {
      parsed.heartbeat = {
        defaultAgentId: status.heartbeat.defaultAgentId,
        agents: status.heartbeat.agents?.map(a => ({
          agentId: a.agentId,
          enabled: a.enabled,
          interval: a.every,
          intervalMs: a.everyMs
        })) || []
      };
    }

    if (status.sessions) {
      parsed.sessions = {
        count: status.sessions.count,
        defaults: status.sessions.defaults,
        recent: status.sessions.recent?.slice(0, 5).map(s => ({
          agentId: s.agentId,
          kind: s.kind,
          sessionId: s.sessionId,
          age: s.age,
          model: s.model,
          percentUsed: s.percentUsed,
          inputTokens: s.inputTokens,
          outputTokens: s.outputTokens
        })) || []
      };
    }

    if (status.channelSummary && status.channelSummary.length > 0) {
      parsed.channels = status.channelSummary.map(c => ({
        provider: c.provider,
        healthy: c.healthy,
        status: c.status
      }));
    }

    if (status.os) {
      parsed.system = {
        platform: status.os.platform,
        arch: status.os.arch,
        release: status.os.release,
        hostname: status.os.hostname
      };
    }

    return parsed;
  }

  /**
   * Get task status from OpenClaw sessions
   */
  getTaskStatus() {
    const statusResult = this.fetchStatus();

    if (!statusResult.success) {
      return statusResult;
    }

    const status = statusResult.status;

    return {
      success: true,
      tasks: {
        heartbeat: status.heartbeat,
        activeSessions: status.sessions?.count || 0,
        recentActivity: status.sessions?.recent || []
      }
    };
  }

  /**
   * Get health summary
   */
  getHealthSummary() {
    const connectivity = this.testConnectivity();

    if (!connectivity.connected) {
      return {
        healthy: false,
        reason: 'OpenClaw not available (Gateway and CLI both failed)',
        connectivity
      };
    }

    const statusResult = this.fetchStatus();

    if (!statusResult.success) {
      return {
        healthy: false,
        reason: 'Failed to fetch OpenClaw status',
        connectivity,
        error: statusResult.error
      };
    }

    const hasHeartbeat = statusResult.status.heartbeat?.agents?.length > 0;

    return {
      healthy: true,
      reason: 'OpenClaw is running and responding',
      connectivity,
      heartbeat: hasHeartbeat,
      sessionCount: statusResult.status.sessions?.count || 0,
      version: statusResult.status.runtime?.version
    };
  }

  /**
   * Get current runtime information
   */
  getRuntimeInfo() {
    const connectivity = this.testConnectivity();

    if (!connectivity.connected) {
      return {
        available: false,
        error: connectivity.error
      };
    }

    const statusResult = this.fetchStatus();

    if (!statusResult.success) {
      return {
        available: false,
        error: statusResult.error
      };
    }

    const status = statusResult.status;

    return {
      available: true,
      version: status.runtime?.version,
      platform: status.system?.platform,
      arch: status.system?.arch,
      hostname: status.system?.hostname,
      defaultAgent: status.heartbeat?.defaultAgentId,
      agents: status.heartbeat?.agents?.map(a => a.agentId) || []
    };
  }

  /**
   * Check if gateway is running
   */
  isGatewayRunning() {
    try {
      execSync(
        `curl -s -m 2 http://${this.gatewayHost}:${this.gatewayPort}/health >/dev/null 2>&1`,
        { timeout: 3000 }
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get last known status
   */
  getLastStatus() {
    return this.lastStatus;
  }

  /**
   * Check if service is connected
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Get last error
   */
  getLastError() {
    return this.lastError;
  }
}

module.exports = new OpenClawService();