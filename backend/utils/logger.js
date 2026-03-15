const config = require('../config');

class Logger {
  constructor() {
    this.level = config.get('LOG_LEVEL') || 'info';
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  format(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    return data ? `${formatted} ${JSON.stringify(data)}` : formatted;
  }

  log(level, message, data = null) {
    if (this.levels[level] <= this.levels[this.level]) {
      const formatted = this.format(level, message, data);
      console.log(formatted);
    }
  }

  error(message, error = null) {
    this.log('error', message, error);
  }

  warn(message, data = null) {
    this.log('warn', message, data);
  }

  info(message, data = null) {
    this.log('info', message, data);
  }

  debug(message, data = null) {
    this.log('debug', message, data);
  }
}

module.exports = new Logger();