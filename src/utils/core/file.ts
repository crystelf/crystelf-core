import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import paths from './path';
import date from './date';
import logger from './logger';

class fc {
  public static createDir(targetPath: string = '', includeFile: boolean = false): void {
    const root = paths.get('root');

    if (path.isAbsolute(targetPath)) {
      if (includeFile) {
        const parentDir = path.dirname(targetPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
          logger.debug(`成功创建绝对目录: ${parentDir}`);
        }
        return;
      }

      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
        logger.debug(`成功创建绝对目录: ${targetPath}`);
      }
      return;
    }

    const fullPath = includeFile
      ? path.join(root, path.dirname(targetPath))
      : path.join(root, targetPath);

    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      logger.debug(`成功创建相对目录: ${fullPath}`);
    }
  }

  public static logToFile(level: string, message: string): void {
    const logFile = path.join(paths.get('log'), `${date.getCurrentDate()}.log`);
    const logMessage = `[${date.getCurrentTime()}] [${level}] ${message}\n`;

    fs.appendFile(logFile, logMessage, (err) => {
      if (err) console.error(chalk.red('[LOGGER] 写入日志失败:'), err);
    });
  }
}

export default fc;
