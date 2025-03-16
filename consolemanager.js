import chalk from 'chalk';

class ConsoleManager {
  static LogLevel = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
  };

  static _consoleAllocated = false;

  static initialize() {
    if (!this._consoleAllocated) {
      this._consoleAllocated = true;
      this.log('Console initialized.', ConsoleManager.LogLevel.INFO);
    }
  }

  static shutdown() {
    if (this._consoleAllocated) {
      this._consoleAllocated = false;
      this.log('Console shutdown.', ConsoleManager.LogLevel.INFO);
    }
  }

  static log(message, level = ConsoleManager.LogLevel.INFO) {
    if (!this._consoleAllocated) this.initialize(); // Initialize if not allocated yet

    const timestamp = this.getTimestamp();

    switch (level) {
      case ConsoleManager.LogLevel.DEBUG:
        console.log(chalk.gray(`[${timestamp}] [DEBUG] ${message}`));
        break;
      case ConsoleManager.LogLevel.INFO:
        console.log(chalk.cyan(`[${timestamp}] [INFO] ${message}`));
        break;
      case ConsoleManager.LogLevel.WARNING:
        console.log(chalk.yellow(`[${timestamp}] [WARNING] ${message}`));
        break;
      case ConsoleManager.LogLevel.ERROR:
        console.log(chalk.red(`[${timestamp}] [ERROR] ${message}`));
        break;
      default:
        console.log(`[${timestamp}] [INFO] ${message}`); // Default to INFO level if unknown
    }
  }

  static getTimestamp() {
    const now = new Date();
    return now.toISOString().slice(11, 19); // Extract HH:mm:ss part of the ISO string
  }
}

export default ConsoleManager;  // Change this line to ES module export
