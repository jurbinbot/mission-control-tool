const fs = require('fs');
const path = require('path');

class Config {
  constructor() {
    this.envFile = path.join(__dirname, '../../.env');
    this.config = {};
    this.load();
  }

  load() {
    if (fs.existsSync(this.envFile)) {
      const envContent = fs.readFileSync(this.envFile, 'utf8');
      const lines = envContent.split('\n');
      lines.forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          this.config[key.trim()] = valueParts.join('=').trim();
        }
      });
    }

    // Default values
    this.config.PORT = this.config.PORT || '3001';
    this.config.LOG_LEVEL = this.config.LOG_LEVEL || 'info';
    this.config.CPU_THRESHOLD = this.config.CPU_THRESHOLD || '80';
    this.config.MEMORY_THRESHOLD = this.config.MEMORY_THRESHOLD || '80';
    this.config.DISK_THRESHOLD = this.config.DISK_THRESHOLD || '90';
    this.config.BACKUP_DIR = this.config.BACKUP_DIR || '/tmp/mission-control-backups';
    this.config.BACKUP_SCHEDULE = this.config.BACKUP_SCHEDULE || '0 0 * * *';
    this.config.UPDATE_SCHEDULE = this.config.UPDATE_SCHEDULE || '0 3 * * *';
    this.config.OPENCLAW_API_TIMEOUT = this.config.OPENCLAW_API_TIMEOUT || '5000';

    // Validate required variables
    this.validate();
  }

  validate() {
    const required = ['PORT'];
    const missing = required.filter(key => !this.config[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  get(key) {
    return this.config[key];
  }

  getNumber(key) {
    return parseInt(this.config[key], 10);
  }

  getBoolean(key) {
    const value = this.config[key];
    return value === 'true' || value === '1' || value === 'yes';
  }
}

module.exports = new Config();];
  }

  getNumber(key) {
    return parseInt(this.config[key], 10);
  }
}

module.exports = new Config();