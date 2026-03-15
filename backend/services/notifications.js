const { execSync } = require('child_process');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Notification Service
 * Sends notifications via OpenClaw Gateway API or CLI
 */
class NotificationService {
  constructor() {
    this.enabled = config.get('NOTIFICATIONS_ENABLED') !== 'false';
    this.discordUserId = config.get('DISCORD_USER_ID') || null;
    this.notifyOnComplete = config.get('NOTIFY_ON_COMPLETE') !== 'false';
    this.notifyOnFailed = config.get('NOTIFY_ON_FAILED') !== 'false';
    this.gatewayHost = config.get('OPENCLAW_GATEWAY_HOST') || 'host.containers.internal';
    this.gatewayPort = config.get('OPENCLAW_GATEWAY_PORT') || '18789';
  }

  /**
   * Send notification via OpenClaw Gateway API or CLI
   */
  async sendDiscordMessage(message) {
    if (!this.enabled) {
      logger.info('Notifications disabled, skipping Discord message');
      return { success: false, reason: 'disabled' };
    }

    if (!this.discordUserId) {
      logger.warn('Discord user ID not configured, skipping notification');
      return { success: false, reason: 'no_discord_user_id' };
    }

    // Try Gateway API first (works in container environment)
    try {
      const escapedMessage = message.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      const result = execSync(
        `curl -s -X POST "http://${this.gatewayHost}:${this.gatewayPort}/api/message" ` +
        `-H "Content-Type: application/json" ` +
        `-d '{"channel":"discord","to":"user:${this.discordUserId}","message":"${escapedMessage}"}'`,
        { encoding: 'utf8', timeout: 10000 }
      );
      
      const response = JSON.parse(result);
      if (response.success || response.status === 'sent') {
        logger.info('Discord notification sent via Gateway API');
        return { success: true, method: 'gateway-api' };
      }
      
      // If Gateway returned an error, fall through to CLI
      logger.warn('Gateway API response:', response);
    } catch (gatewayError) {
      logger.info('Gateway API not available, trying CLI:', gatewayError.message);
    }

    // Fallback to CLI
    try {
      const escapedMessage = message.replace(/"/g, '\\"');
      const result = execSync(
        `openclaw message send --channel discord --target "user:${this.discordUserId}" --message "${escapedMessage}"`,
        { encoding: 'utf8', timeout: 10000 }
      );
      
      logger.info('Discord notification sent successfully via CLI');
      return { success: true, method: 'cli' };
    } catch (cliError) {
      logger.error('Failed to send Discord notification', cliError);
      return { success: false, error: cliError.message };
    }
  }

  /**
   * Notify on task completion
   */
  async notifyTaskComplete(task) {
    if (!this.notifyOnComplete) {
      return { success: false, reason: 'complete_notifications_disabled' };
    }

    const message = `✅ Task Complete: **${task.title}**\n` +
      `ID: ${task.id}\n` +
      `Priority: ${task.priority}\n` +
      `Agent: ${task.assignedAgent || 'Unassigned'}`;

    return this.sendDiscordMessage(message);
  }

  /**
   * Notify on task failure
   */
  async notifyTaskFailed(task, reason = null) {
    if (!this.notifyOnFailed) {
      return { success: false, reason: 'failed_notifications_disabled' };
    }

    let message = `❌ Task Failed: **${task.title}**\n` +
      `ID: ${task.id}\n` +
      `Priority: ${task.priority}\n` +
      `Agent: ${task.assignedAgent || 'Unassigned'}`;

    if (reason) {
      message += `\nReason: ${reason}`;
    }

    message += '\n_Please review before retrying._';

    return this.sendDiscordMessage(message);
  }

  /**
   * Notify on task status change (generic)
   */
  async notifyTaskStatusChange(task, oldStatus, newStatus) {
    if (newStatus === 'complete') {
      return this.notifyTaskComplete(task);
    }

    if (newStatus === 'failed') {
      return this.notifyTaskFailed(task);
    }

    // No notification for other status changes
    return { success: false, reason: 'no_notification_for_status' };
  }
}

module.exports = new NotificationService();