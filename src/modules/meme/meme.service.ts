import { Inject, Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import { PathService } from '../../core/path/path.service';
import { OpenListService } from '../../core/openlist/openlist.service';
import { AppConfigService } from '../../config/config.service';

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
          if (remoteFiles.code === 200 && remoteFiles.data.content) {
            let remoteFileList = remoteFiles.data.content;
            const localFiles = await this.getLocalFileList(memePath);
            //this.logger.debug(localFiles);
            await this.compareAndDownloadFiles(
              memePath,
              localFiles,
              remoteFileList,
              remoteMemePath,
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
   * 获取本地目录的文件列表
   * @param dir 本地路径
   * @private
   */
  private async getLocalFileList(dir: string): Promise<string[]> {
    const files: string[] = [];
    const dirs: string[] = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          dirs.push(fullPath);
        } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(entry.name)) {
          files.push(fullPath);
        }
      }
      for (const subDir of dirs) {
        const subFiles = await this.getLocalFileList(subDir);
        files.push(...subFiles);
      }
    } catch (error) {
      this.logger.error(`读取本地目录失败: ${dir}`, error);
    }
    return files;
  }

  /**
   * 比较本地文件和远程文件 下载缺失的文件
   * @param localPath 本地路径
   * @param localFiles 本地文件列表
   * @param remoteFiles 远程文件列表
   * @param remoteMemePath 远程基准路径
   * @private
   */
  private async compareAndDownloadFiles(
    localPath: string,
    localFiles: string[],
    remoteFiles: any[],
    remoteMemePath: string,
  ) {
    for (const remoteFile of remoteFiles) {
      let relativePath = path.relative(remoteMemePath, remoteFile.path);
      //this.logger.debug(`relativePath: ${relativePath}`);
      let remoteRelativePath = relativePath.replace(/D:\\alist/g, ''); //服务器下载用目录
      relativePath = relativePath.replace(/D:\\alist\\crystelf\\meme/g, ''); //本地储存用
      //this.logger.debug(`relativeEdPath: ${relativePath}`);
      const localFilePath = path.join(
        localPath,
        relativePath.replace(/\\/g, '/'),
      );
      if (remoteFile.is_dir) {
        try {
          //const localDirPath = path.dirname(localFilePath);
          //await fs.mkdir(localDirPath, { recursive: true });
          //this.logger.log(`文件夹已创建: ${localDirPath}`);
          //相关逻辑已在oplist工具中处理
          const subRemoteFiles =
            await this.openListService.listFiles(remoteRelativePath);
          if (subRemoteFiles.code === 200 && subRemoteFiles.data.content) {
            await this.compareAndDownloadFiles(
              localPath,
              [],
              subRemoteFiles.data.content,
              remoteMemePath,
            );
          }
        } catch (error) {
          this.logger.error(`递归处理文件夹失败: ${localFilePath}`, error);
        }
      } else {
        if (!localFiles.includes(localFilePath)) {
          this.logger.log(`文件缺失: ${localFilePath}, 开始下载..`);
          try {
            await this.openListService.downloadFile(
              remoteRelativePath,
              localFilePath,
            );
            this.logger.log(`文件下载成功: ${localFilePath}`);
          } catch (error) {
            this.logger.error(`下载文件失败: ${localFilePath}`, error);
          }
        }
      }
    }
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
