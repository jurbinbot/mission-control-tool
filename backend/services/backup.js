const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Backup Service
 * Handles backup operations for mission-control-tool data
 */
class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../../backups');
    this.createBackupDir();
    this.backupConfig = {
      maxBackups: 10,
      excludeDirs: ['node_modules', '.git', 'backups']
    };
  }

  createBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      logger.info(`Backup directory created: ${this.backupDir}`);
    }
  }

  createBackup(backupName = null) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupId = backupName || `backup-${timestamp}`;
      const backupPath = path.join(this.backupDir, backupId);

      // Get all directories to backup
      const directoriesToBackup = this.getDirectoriesToBackup();

      // Create tar.gz archive with absolute paths
      const archivePath = path.resolve(`${backupPath}.tar.gz`);
      const archiveCommand = `tar -czf "${archivePath}" ${directoriesToBackup.map(dir => path.resolve(dir)).join(' ')}`;

      fs.mkdirSync(backupPath, { recursive: true });
      require('child_process').execSync(archiveCommand, { stdio: 'inherit' });

      logger.info(`Backup created: ${backupPath}.tar.gz`, {
        directories: directoriesToBackup
      });

      // Clean up old backups
      this.cleanupOldBackups();

      return {
        success: true,
        backupId: backupId,
        path: backupPath,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to create backup', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  getDirectoriesToBackup() {
    // List all directories to backup (excluding excludeDirs)
    const dirsToBackup = [];

    // Backup backend directory
    const backendDir = path.join(__dirname, '../..');
    if (!this.shouldExclude(backendDir)) {
      dirsToBackup.push(backendDir);
    }

    // Backup frontend directory
    const frontendDir = path.join(__dirname, '../../../frontend');
    if (fs.existsSync(frontendDir) && !this.shouldExclude(frontendDir)) {
      dirsToBackup.push(frontendDir);
    }

    // Backup workspace directory (mission-control-tool)
    const workspaceDir = path.join(__dirname, '../../../..');
    if (!this.shouldExclude(workspaceDir)) {
      dirsToBackup.push(workspaceDir);
    }

    return dirsToBackup;
  }

  shouldExclude(dirPath) {
    const relativePath = path.relative(__dirname, dirPath);
    return this.backupConfig.excludeDirs.some(excludeDir => {
      return relativePath.startsWith(excludeDir) ||
             relativePath === excludeDir;
    });
  }

  getBackups() {
    try {
      if (!fs.existsSync(this.backupDir)) {
        return [];
      }

      const backupFiles = fs.readdirSync(this.backupDir);
      const backups = backupFiles
        .filter(file => file.endsWith('.tar.gz'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);

          return {
            name: file.replace('.tar.gz', ''),
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          };
        })
        .sort((a, b) => b.created - a.created);

      return backups;
    } catch (error) {
      logger.error('Failed to get backups list', error);
      return [];
    }
  }

  deleteBackup(backupName) {
    try {
      const backupPath = path.join(this.backupDir, backupName);

      if (!fs.existsSync(backupPath)) {
        return {
          success: false,
          error: 'Backup not found'
        };
      }

      // Remove the directory and archive
      const archivePath = `${backupPath}.tar.gz`;
      fs.rmSync(backupPath, { recursive: true, force: true });

      if (fs.existsSync(archivePath)) {
        fs.unlinkSync(archivePath);
      }

      logger.info(`Backup deleted: ${backupName}`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to delete backup: ${backupName}`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  restoreBackup(backupName) {
    try {
      const backupPath = path.join(this.backupDir, backupName);
      const archivePath = `${backupPath}.tar.gz`;

      if (!fs.existsSync(archivePath)) {
        return {
          success: false,
          error: 'Backup archive not found'
        };
      }

      // Extract backup
      const extractCommand = `tar -xzf "${archivePath}" -C "${backupPath}"`;
      require('child_process').execSync(extractCommand, { stdio: 'inherit' });

      logger.info(`Backup restored: ${backupName}`, { backupPath });
      return {
        success: true,
        backupPath: backupPath
      };
    } catch (error) {
      logger.error(`Failed to restore backup: ${backupName}`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  cleanupOldBackups() {
    try {
      const backups = this.getBackups();

      if (backups.length <= this.backupConfig.maxBackups) {
        return;
      }

      // Remove oldest backups
      const backupsToDelete = backups.slice(this.backupConfig.maxBackups);

      for (const backup of backupsToDelete) {
        this.deleteBackup(backup.name);
      }

      logger.info(`Cleaned up old backups: ${backupsToDelete.length} deleted`);
    } catch (error) {
      logger.error('Failed to cleanup old backups', error);
    }
  }
}

module.exports = new BackupService();