import path from 'path';
import paths from '../core/path';
import fc from '../core/file';
import logger from '../core/logger';
import fs from 'fs/promises';

class Persistence {
  private static getUserDataPath(username: string): string {
    return path.join(paths.get('userData'), username, 'data.json');
  }

  private static async ensureUserPath(username: string): Promise<void> {
    const userPath = path.join(paths.get('userData'), username);
    try {
      await fc.createDir(userPath, false);
    } catch (err) {
      logger.error(err);
    }
  }

  public static async writeDataLocal<T>(username: string, data: T): Promise<void> {
    await this.ensureUserPath(username);
    const filePath = this.getUserDataPath(username);

    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      logger.debug(`用户数据已持久化到本地${filePath}`);
    } catch (err) {
      logger.error(err);
    }
  }

  public static async readDataLocal<T>(username: string): Promise<T | undefined> {
    const filePath = this.getUserDataPath(username);

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
