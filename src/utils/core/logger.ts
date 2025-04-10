import chalk from 'chalk';
import config from './config';
import fc from './file';
import date from './date';

class Logger {
  private static instance: Logger;
  private readonly isDebug: boolean;

  private constructor() {
    this.isDebug = config.get('DEBUG', false);
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public debug(...args: any[]): void {
    if (this.isDebug) {
      const message = this.formatMessage('DEBUG', args);
      console.log(chalk.cyan(message));
    }
  }

  public info(...args: any[]): void {
    const message = this.formatMessage('INFO', args);
    console.log(chalk.green(message));
    this.logToFile(message).then();
  }

  public warn(...args: any[]): void {
    const message = this.formatMessage('WARN', args);
    console.log(chalk.yellow(message));
    this.logToFile(message).then();
  }

  public error(...args: any[]): void {
    const message = this.formatMessage('ERROR', args);
    console.error(chalk.red(message));
    this.logToFile(message).then();
  }

  public fatal(exitCode: number = 1, ...args: any[]): never {
    const message = this.formatMessage('FATAL', args);
    console.error(chalk.red.bold(message));
    this.logToFile(message).then();
    process.exit(exitCode);
  }

  private formatMessage(level: string, args: any[]): string {
    return `[${date.getCurrentTime()}][${level}] ${args
      .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg))
      .join(' ')}`;
  }

  private async logToFile(message: string): Promise<void> {
    try {
      await fc.logToFile(`${message}`);
    } catch (err: any) {
      console.error(chalk.red(`[LOGGER] 写入日志失败: ${err.message}`));
    }
  }
}

const logger = Logger.getInstance();
export default logger;
