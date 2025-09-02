import { Inject, Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { promises as fs } from 'fs';
import { PathService } from '../path/path.service';
@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @Inject(PathService)
    private readonly paths: PathService,
  ) {}

  /**
   * 创建目录
   * @param targetPath 目标路径
   * @param includeFile 是否包含文件路径
   */
  public async createDir(targetPath = '', includeFile = false): Promise<void> {
    const root = this.paths.get('root');
    try {
      const dirToCreate = path.isAbsolute(targetPath)
        ? includeFile
          ? path.dirname(targetPath)
          : targetPath
        : path.join(root, includeFile ? path.dirname(targetPath) : targetPath);

      await fs.mkdir(dirToCreate, { recursive: true });
    } catch (err) {
      this.logger.error(`创建目录失败: ${err}`);
    }
  }
}
