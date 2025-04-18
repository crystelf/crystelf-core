import path from 'path';
import fs from 'fs';
import fc from './file';
import logger from './logger';

class PathManager {
  private static instance: PathManager;
  private readonly baseDir: string;

  private constructor() {
    this.baseDir = path.join(__dirname, '../../..');
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): PathManager {
    if (!PathManager.instance) {
      PathManager.instance = new PathManager();
    }
    return PathManager.instance;
  }

  /**
   * 获取预定义路径
   * @param type 路径类型
   */
  public get(type?: PathType): string {
    const mappings: Record<PathType, string> = {
      root: this.baseDir,
      public: path.join(this.baseDir, 'public'),
      images: path.join(this.baseDir, 'public/files/image'),
      log: path.join(this.baseDir, 'logs'),
      config: path.join(this.baseDir, 'config'),
      temp: path.join(this.baseDir, 'temp'),
      userData: path.join(this.baseDir, 'private/data'),
      files: path.join(this.baseDir, 'public/files'),
      media: path.join(this.baseDir, 'public/files/media'),
    };

    return type ? mappings[type] : this.baseDir;
  }

  /**
   * 初始化
   */
  public init(): void {
    const logPath = this.get('log');
    const imagePath = this.get('images');
    const dataPath = this.get('userData');
    const mediaPath = this.get('media');
    fc.createDir(logPath, false);
    fc.createDir(imagePath, false);
    fc.createDir(mediaPath, false);
    fc.createDir(dataPath, false);
    logger.debug(`日志目录初始化: ${logPath}`);
    logger.debug(`图像目录初始化: ${imagePath};${mediaPath}`);
    logger.debug(`用户数据目录初始化: ${dataPath}`);
  }

  /**
   * 解析相对路径（基于项目根目录）
   * @param segments 路径片段
   */
  public resolve(...segments: string[]): string {
    return path.join(this.baseDir, ...segments);
  }

  /**
   * 检查路径是否存在（同步）
   */
  public existsSync(targetPath: string): boolean {
    try {
      return fs.existsSync(targetPath);
    } catch {
      return false;
    }
  }
}

type PathType =
  | 'root'
  | 'public'
  | 'images'
  | 'log'
  | 'config'
  | 'temp'
  | 'userData'
  | 'files'
  | 'media';

const paths = PathManager.getInstance();
export default paths;
