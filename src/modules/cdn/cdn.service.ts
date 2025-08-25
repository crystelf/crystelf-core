import { Inject, Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { existsSync } from 'fs';
import { PathService } from '../../core/path/path.service';

@Injectable()
export class CdnService {
  private readonly logger = new Logger(CdnService.name);
  private filePath: string;
  @Inject(PathService)
  private readonly paths: PathService;
  constructor() {
    this.logger.log(`晶灵云图数据中心初始化.. 数据存储在: ${this.filePath}`);
  }

  /**
   * 获取文件
   * @param relativePath 文件相对路径
   */
  async getFile(relativePath: string): Promise<string | null> {
    if (!this.filePath) this.filePath = this.paths.get('public');
    if (
      !this.isValidPath(relativePath) &&
      !this.isValidFilename(path.basename(relativePath))
    ) {
      throw new Error('非法路径请求');
    }

    const filePath = path.join(this.filePath, relativePath);
    this.logger.debug(`尝试访问文件路径: ${filePath}`);

    return existsSync(filePath) ? filePath : null;
  }

  /**
   * 检查路径合法性
   */
  private isValidPath(relativePath: string): boolean {
    try {
      const normalized = path.normalize(relativePath);
      let flag = true;
      if (normalized.startsWith('../') && path.isAbsolute(normalized))
        flag = false;
      return flag;
    } catch (err) {
      this.logger.error(err);
      return false;
    }
  }

  private isValidFilename(filename: string): boolean {
    return /^[a-zA-Z0-9_\-.]+$/.test(filename);
  }
}
