import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '@nestjs/common';

@Injectable()
export class PathService {
  private readonly baseDir: string;
  private readonly logger = new Logger(PathService.name);

  constructor() {
    this.baseDir = path.join(__dirname, '../../..');
    this.initializePaths();
  }

  /**
   * 获取预定义路径
   * @param type 路径类型
   */
  public get(type?: PathType): string {
    const mappings: Record<PathType, string> = {
      root: this.baseDir,
      public: path.join(this.baseDir, 'public'),
      log: path.join(this.baseDir, 'logs'),
      config: path.join(this.baseDir, 'config'),
      temp: path.join(this.baseDir, 'temp'),
      userData: path.join(this.baseDir, 'private/data'),
      package: path.join(this.baseDir, 'package.json'),
      modules: path.join(this.baseDir, 'src/modules'),
      words: path.join(this.baseDir, 'private/words/src'),
      private: path.join(this.baseDir, 'private'),
      meme: path.join(this.baseDir, 'private/meme'),
    };

    return type ? mappings[type] : this.baseDir;
  }

  /**
   * 初始化必要的目录
   */
  private initializePaths(): void {
    this.logger.log('path初始化..');
    const pathsToInit = [
      this.get('log'),
      this.get('config'),
      this.get('userData'),
      this.get('temp'),
      this.get('public'),
      this.get('words'),
      this.get('meme'),
    ];

    pathsToInit.forEach((dirPath) => {
      if (!fs.existsSync(dirPath)) {
        this.createDir(dirPath);
        this.logger.debug(`创建目录：${dirPath}..`);
      }
    });
    this.logger.log('path初始化完毕!');
  }

  /**
   * 创建目录
   * @param targetPath 目标路径
   * @param includeFile 是否包含文件路径
   */
  public createDir(targetPath: string, includeFile: boolean = false): void {
    try {
      const dirToCreate = includeFile ? path.dirname(targetPath) : targetPath;
      fs.mkdirSync(dirToCreate, { recursive: true });
      this.logger.debug(`成功创建目录: ${dirToCreate}`);
    } catch (err) {
      this.logger.error(`创建目录失败: ${err}`);
    }
  }
}

export type PathType =
  | 'root'
  | 'public'
  | 'log'
  | 'config'
  | 'temp'
  | 'userData'
  | 'package'
  | 'meme'
  | 'modules'
  | 'private'
  | 'words';
