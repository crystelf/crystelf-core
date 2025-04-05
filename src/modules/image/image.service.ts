import path from 'path';
import fs from 'fs';
import paths from '../../utils/core/path';
import logger from '../../utils/core/logger';

class ImageService {
  private readonly imageDir: string;

  constructor() {
    this.imageDir = paths.get('images');
    logger.info(`晶灵云图数据中心初始化..数据存储在: ${this.imageDir}`);
  }

  public getImage(filename: string): string | null {
    const filePath = path.join(this.imageDir, filename);
    logger.debug(`尝试访问图像路径: ${filePath}`);

    if (!this.isValidFilename(filename)) {
      throw new Error('无效的文件名格式..');
    }

    return fs.existsSync(filePath) ? filePath : null;
  }

  private isValidFilename(filename: string): boolean {
    return /^[a-zA-Z0-9_\-\.]+$/.test(filename);
  }
}

export default ImageService;
