import path from 'path';
import fs from 'fs/promises';
import paths from '../../utils/core/path';
import logger from '../../utils/core/logger';
import { existsSync } from 'fs';

class FileService {
  private readonly filePath: string;

  constructor() {
    this.filePath = paths.get('files');
    logger.info(`晶灵云图数据中心初始化..数据存储在: ${this.filePath}`);
  }

  /**
   * 获取文件
   * @param relativePath 文件绝对路径
   */
  public async getFile(relativePath: string): Promise<string | null> {
    if (!this.isValidPath(relativePath) && !this.isValidFilename(path.basename(relativePath))) {
      throw new Error('非法路径请求');
    }

    const filePath = path.join(this.filePath, relativePath);
    logger.debug(`尝试访问文件路径: ${filePath}`);

    return existsSync(filePath) ? filePath : null;
  }

  /**
   * 保存文件到目标目录
   * @param file multer的file
   * @param dir 可选上传目录，相对目录
   */
  public async saveUploadedFile(
    file: Express.Multer.File,
    dir: string = ''
  ): Promise<{ fullPath: string; relativePath: string }> {
    const baseDir = paths.get('uploads');
    const targetDir = path.join(baseDir, dir);
    if (!existsSync(targetDir)) {
      await fs.mkdir(targetDir, { recursive: true });
      logger.debug(`已创建上传目录: ${targetDir}`);
    }
    const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    const finalPath = path.join(targetDir, fileName);
    await fs.rename(file.path, finalPath);
    logger.info(`保存上传文件: ${finalPath}`);
    return {
      fullPath: finalPath,
      relativePath: `uploads/${dir}/${fileName}`,
    };
  }

  /**
   * 定时删除文件
   * @param filePath 文件绝对路径
   * @param timeoutMs 毫秒，默认10分钟
   */
  public async scheduleDelete(filePath: string, timeoutMs: number = 10 * 60 * 1000): Promise<void> {
    setTimeout(async () => {
      try {
        await fs.unlink(filePath);
        logger.info(`已自动删除文件: ${filePath}`);
      } catch (err) {
        logger.warn(`删除文件失败: ${filePath}`, err);
      }
    }, timeoutMs);
  }

  /**
   * 检查路径合法性
   * @param relativePath
   * @private
   */
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
