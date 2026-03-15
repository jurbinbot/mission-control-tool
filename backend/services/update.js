const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Update Service
 * Handles software updates for mission-control-tool
 */
class UpdateService {
  constructor() {
    this.repoPath = path.join(__dirname, '../../../..');
    this.updateConfig = {
      dryRun: process.env.UPDATE_DRY_RUN === 'true',
      backupBeforeUpdate: true,
      updateInterval: '0 4 * * *' // Daily at 4 AM
    };
    this.lastUpdateCheck = null;
  }

  checkForUpdates() {
    try {
      logger.info('Checking for updates...');

      // Determine if we should use npm or git
      const useNpm = fs.existsSync(path.join(this.repoPath, 'package.json'));

      let updateAvailable = false;
      let latestVersion = null;
      let currentVersion = null;

      if (useNpm) {
        const packageJsonPath = path.join(this.repoPath, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        currentVersion = packageJson.version;

        // Fetch latest version from npm
        latestVersion = this.getLatestNpmVersion('mission-control-tool');

        if (latestVersion && latestVersion !== currentVersion) {
          updateAvailable = true;
        }
      }

      this.lastUpdateCheck = new Date().toISOString();

      return {
        success: true,
        updateAvailable,
        currentVersion,
        latestVersion,
        lastUpdateCheck: this.lastUpdateCheck
      };
    } catch (error) {
      logger.error('Failed to check for updates', error);
      return {
        success: false,
        updateAvailable: false,
        error: error.message
      };
    }
  }

  getLatestNpmVersion(packageName) {
    try {
      const exec = require('child_process').execSync;
      const output = exec(`npm show ${packageName} version`, {
        cwd: this.repoPath,
        encoding: 'utf8'
      });
      return output.trim();
    } catch (error) {
      logger.warn(`Failed to fetch latest version for ${packageName}`, error);
      return null;
    }
  }

  performUpdate(options = {}) {
    try {
      const dryRun = options.dryRun ?? this.updateConfig.dryRun;

      if (dryRun) {
        logger.info('[DRY RUN] Update would proceed');
        return {
          success: true,
          dryRun: true,
          message: 'This is a dry-run. No changes were made.',
          currentVersion: this.getCurrentVersion(),
          latestVersion: this.getLatestNpmVersion('mission-control-tool')
        };
      }

      logger.info('Performing update...');

      // Create backup if configured
      if (this.updateConfig.backupBeforeUpdate) {
        const backup = require('./backup');
        backup.createBackup();
      }

      // Perform the update
      const updateCommand = 'npm update';
      const exec = require('child_process').execSync;
      exec(updateCommand, { cwd: this.repoPath, stdio: 'inherit' });

      // Verify the update
      const packageJsonPath = path.join(this.repoPath, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const newVersion = packageJson.version;

      logger.info(`Update completed. New version: ${newVersion}`);

      return {
        success: true,
        dryRun: false,
        currentVersion: this.getCurrentVersion(),
        newVersion,
        message: 'Update completed successfully'
      };
    } catch (error) {
      logger.error('Update failed', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  getCurrentVersion() {
    try {
      const packageJsonPath = path.join(this.repoPath, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      return packageJson.version;
    } catch (error) {
      logger.warn('Failed to get current version', error);
      return 'unknown';
    }
  }

  getUpdateHistory() {
    try {
      const historyPath = path.join(this.repoPath, '.update_history.json');

      if (!fs.existsSync(historyPath)) {
        return [];
      }

      const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      return history;
    } catch (error) {
      logger.warn('Failed to get update history', error);
      return [];
    }
  }

  recordUpdate(newVersion) {
    try {
      const historyPath = path.join(this.repoPath, '.update_history.json');
      const history = this.getUpdateHistory();

      const updateRecord = {
        timestamp: new Date().toISOString(),
        version: newVersion
      };

      history.unshift(updateRecord);

      // Keep last 50 updates
      if (history.length > 50) {
        history.length = 50;
      }

      fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
      logger.info(`Update recorded: ${newVersion}`);
    } catch (error) {
      logger.error('Failed to record update', error);
    }
  }

  rollback(updateName) {
    try {
      const backup = require('./backup');
      const backupInfo = backup.getBackups().find(b => b.name === updateName);

      if (!backupInfo) {
        return {
          success: false,
          error: 'Backup not found'
        };
      }

      logger.info(`Rolling back to backup: ${updateName}`);
      return backup.restoreBackup(updateName);
    } catch (error) {
      logger.error('Rollback failed', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  getUpdateStatus() {
    return {
      lastUpdateCheck: this.lastUpdateCheck,
      currentVersion: this.getCurrentVersion(),
      latestVersion: this.getLatestNpmVersion('mission-control-tool'),
      updateAvailable: this.checkForUpdates().updateAvailable,
      history: this.getUpdateHistory()
    };
  }
}

module.exports = new UpdateService();