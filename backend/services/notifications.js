const { execSync } = require('child_process');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Notification Service
 * Sends notifications via OpenClaw message tool (Discord, etc.)
 */
class NotificationService {
  constructor() {
    this.enabled = config.get('NOTIFICATIONS_ENABLED') !== 'false';
    this.discordUserId = config.get('DISCORD_USER_ID') || null;
    this.notifyOnComplete = config.get('NOTIFY_ON_COMPLETE') !== 'false';
    this.notifyOnFailed = config.get('NOTIFY_ON_FAILED') !== 'false';
  }

  /**
   * Send notification via OpenClaw message tool
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

    try {
      const escapedMessage = message.replace(/"/g, '\\"');
      const result = execSync(
        `openclaw message send --channel discord --target "user:${this.discordUserId}" --message "${escapedMessage}"`,
        { encoding: 'utf8', timeout: 10000 }
      );
      
      logger.info('Discord notification sent successfully');
      return { success: true, output: result };
    } catch (error) {
      logger.error('Failed to send Discord notification', error);
      return { success: false, error: error.message };
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