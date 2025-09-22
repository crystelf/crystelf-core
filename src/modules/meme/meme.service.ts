import { Inject, Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import { PathService } from '../../core/path/path.service';
import { OpenListService } from '../../core/openlist/openlist.service';
import { AppConfigService } from '../../config/config.service';
import { FilesService } from '../../core/files/files.service';

@Injectable()
export class MemeService {
  private readonly logger = new Logger(MemeService.name);
  private readonly updateMs = 15 * 60 * 1000; // 15min

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
  }

  private startAutoUpdate() {
    setInterval(async () => {
      const memePath = path.join(this.pathService.get('meme'));
      const remoteMemePath = this.configService.get('OPENLIST_API_MEME_PATH');
      if (remoteMemePath) {
        this.logger.log('定时检查表情仓库更新..');
        try {
          const remoteFiles =
            await this.openListService.listFiles(remoteMemePath);
          //this.logger.debug(`remoteFiles: ${remoteFiles}`);
          if (remoteFiles.code === 200 && remoteFiles.data.content) {
            let remoteFileList = remoteFiles.data.content;
            const localFiles =
              await this.filesService.getLocalFileList(memePath);
            //this.logger.debug(localFiles);
            await this.filesService.compareAndDownloadFiles(
              memePath,
              localFiles,
              remoteFileList,
              remoteMemePath,
              '\\crystelf\\meme',
            );
          } else {
            this.logger.error('获取远程表情仓库文件失败..');
          }
        } catch (error) {
          this.logger.error('定时检查表情仓库更新失败..', error);
        }
      } else {
        this.logger.warn('未配置远程表情包地址..');
      }
    }, this.updateMs);
  }

  /**
   * 获取表情路径
   * @param character 角色
   * @param status 状态
   */
  public async getRandomMemePath(
    character?: string,
    status?: string,
  ): Promise<string | null> {
    const baseDir = path.join(this.pathService.get('meme'));

    try {
      if (!character) {
        return this.getRandomFileRecursive(baseDir);
      }
      const characterDir = path.join(baseDir, character);
      if (!status) {
        return this.getRandomFileRecursive(characterDir);
      }
      const statusDir = path.join(characterDir, status);
      return this.getRandomFileFromDir(statusDir);
    } catch (e) {
      this.logger.error(`获取表情包失败: ${e.message}`);
      return null;
    }
  }

  /**
   * 从目录中随机获取一张图片
   * @param dir 绝对目录
   * @private
   */
  private async getRandomFileFromDir(dir: string): Promise<string | null> {
    try {
      const files = await fs.readdir(dir);
      const images = files.filter((f) => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
      if (images.length === 0) return null;
      const randomFile = images[Math.floor(Math.random() * images.length)];
      return path.join(dir, randomFile);
    } catch {
      return null;
    }
  }

  /**
   * 随机选择一张图片
   * @param dir 绝对路径
   * @private
   */
  private async getRandomFileRecursive(dir: string): Promise<string | null> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files: string[] = [];
      const dirs: string[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          dirs.push(path.join(dir, entry.name));
        } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(entry.name)) {
          files.push(path.join(dir, entry.name));
        }
      }
      let allFiles = [...files];
      for (const subDir of dirs) {
        const subFile = await this.getRandomFileRecursive(subDir);
        if (subFile) allFiles.push(subFile);
      }
      if (allFiles.length === 0) return null;
      return allFiles[Math.floor(Math.random() * allFiles.length)];
    } catch {
      return null;
    }
  }
}
