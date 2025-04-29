import path from 'path';
import paths from '../core/path';
import fc from '../core/file';
import logger from '../core/logger';
import fs from 'fs/promises';

class Persistence {
  private static getDataPath(dataName: string, fileName: string): string {
    return path.join(paths.get('userData'), dataName, `${fileName}.json`);
  }

  private static async ensureUserPath(dataName: string): Promise<void> {
    const dataPath = path.join(paths.get('userData'), dataName);
    try {
      await fc.createDir(dataPath, false);
    } catch (err) {
      logger.error(err);
    }
  }

  public static async writeDataLocal<T>(
    dataName: string,
    data: T,
    fileName: string
  ): Promise<void> {
    await this.ensureUserPath(dataName);
    const filePath = this.getDataPath(dataName, fileName);

    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      logger.debug(`用户数据已持久化到本地${filePath}`);
    } catch (err) {
      logger.error(err);
    }
  }

  public static async readDataLocal<T>(dataName: string, fileName: string): Promise<T | undefined> {
    const filePath = this.getDataPath(dataName, fileName);

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data) as T;
    } catch (err) {
      logger.error(err);
      return undefined;
    }
  }
}

export default Persistence;
