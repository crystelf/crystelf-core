import path from 'path';
import fs from 'fs';
import paths from '../../utils/core/path';
import logger from '../../utils/core/logger';

class FileService {
  private readonly filePath: string;

  constructor() {
    this.filePath = paths.get('files');
    logger.info(`晶灵云图数据中心初始化..数据存储在: ${this.filePath}`);
  }

  public async getFile(relativePath: string): Promise<string | null> {
    if (!this.isValidPath(relativePath) && !this.isValidFilename(path.basename(relativePath))) {
      throw new Error('非法路径请求');
    }

    const filePath = path.join(this.filePath, relativePath);
    logger.debug(`尝试访问图像路径: ${filePath}`);

    return fs.existsSync(filePath) ? filePath : null;
  }

  private isValidPath(relativePath: string): boolean {
    try {
      const normalized = path.normalize(relativePath);
      let flag = true;
      if (normalized.startsWith('../') && path.isAbsolute(normalized)) flag = false;
      return flag;
    } catch (err) {
      logger.error(err);
      return false;
    }
  }

  private isValidFilename(filename: string): boolean {
    return /^[a-zA-Z0-9_\-.]+$/.test(filename);
  }
}

export default FileService;
