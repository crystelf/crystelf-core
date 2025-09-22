import { Inject, Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { existsSync } from 'fs';
import { PathService } from '../../core/path/path.service';
import { OpenListService } from '../../core/openlist/openlist.service';
import { AppConfigService } from '../../config/config.service';
import { FilesService } from '../../core/files/files.service';

@Injectable()
export class CdnService {
  private readonly logger = new Logger(CdnService.name);
  private filePath: string;
  private readonly updateMs = 15 * 60 * 1000; // 15min
  @Inject(PathService)
  private readonly paths: PathService;
  constructor(
    @Inject(PathService)
    private readonly pathService: PathService,
    @Inject(OpenListService)
    private readonly openListService: OpenListService,
    @Inject(AppConfigService)
    private readonly configService: AppConfigService,
    @Inject(FilesService)
    private readonly filesService: FilesService,
  ) {
    this.startAutoUpdate();
    this.logger.log(`晶灵云图数据中心初始化.. 数据存储在: ${this.filePath}`);
  }

  private startAutoUpdate() {
    setInterval(async () => {
      const cdnPath = path.join(this.pathService.get('private'));
      const remoteCdnPath = this.configService.get('OPENLIST_API_CDN_PATH');
      if (remoteCdnPath) {
        this.logger.log('定时检查晶灵cdn更新..');
        try {
          const remoteFiles =
            await this.openListService.listFiles(remoteCdnPath);
          if (remoteFiles.code === 200 && remoteFiles.data.content) {
            let remoteFileList = remoteFiles.data.content;
            const localFiles =
              await this.filesService.getLocalFileList(cdnPath);
            await this.filesService.compareAndDownloadFiles(
              cdnPath,
              localFiles,
              remoteFileList,
              remoteCdnPath,
              '\crystelf\cdn',
            );
          } else {
            this.logger.error(`晶灵cdn检查更新失败: ${remoteFiles.code}`);
          }
        } catch (error) {
          this.logger.error(`晶灵cdn检查更新失败: ${error}`);
        }
      } else {
        this.logger.warn('未配置远程表情包地址..');
      }
    }, this.updateMs);
  }

  /**
   * 获取文件
   * @param relativePath 文件相对路径
   */
  public async getFile(relativePath: string): Promise<string | null> {
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
