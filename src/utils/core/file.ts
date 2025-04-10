import path from 'path';
import fs from 'fs/promises';
import paths from './path';
import date from './date';
import logger from './logger';
import chalk from 'chalk';

class fc {
  /**
   * 创建目录
   * @param targetPath 目标路径
   * @param includeFile 是否包含文件路径
   */
  public static async createDir(
    targetPath: string = '',
    includeFile: boolean = false
  ): Promise<void> {
    const root = paths.get('root');

    try {
      if (path.isAbsolute(targetPath)) {
        const dirToCreate = includeFile ? path.dirname(targetPath) : targetPath;
        await fs.mkdir(dirToCreate, { recursive: true });
        //logger.debug(`成功创建绝对目录: ${dirToCreate}`);
        return;
      }

      const fullPath = includeFile
        ? path.join(root, path.dirname(targetPath))
        : path.join(root, targetPath);

      await fs.mkdir(fullPath, { recursive: true });
      //logger.debug(`成功创建相对目录: ${fullPath}`);
    } catch (err) {
      logger.error(`创建目录失败: ${err}`);
    }
  }

  public static async logToFile(message: string): Promise<void> {
    const logFile = path.join(paths.get('log'), `${date.getCurrentDate()}.log`);
    const logMessage = `${message}\n`;

    try {
      //await this.createDir(paths.get('log'));

      await fs.appendFile(logFile, logMessage);
    } catch (err) {
      console.error(chalk.red('[LOGGER] 写入日志失败:'), err);
    }
  }
}

export default fc;
