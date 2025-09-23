import { Inject, Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { promises as fs } from 'fs';
import { PathService } from '../path/path.service';
import { OpenListService } from '../openlist/openlist.service';
import { AppConfigService } from '../../config/config.service';
@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @Inject(PathService)
    private readonly paths: PathService,
    @Inject(AppConfigService)
    private readonly configService: AppConfigService,
    @Inject(OpenListService)
    private readonly openListService: OpenListService,
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

  /**
   * 比较本地文件和远程文件 下载缺失的文件
   * @param localPath 本地路径
   * @param localFiles 本地文件列表
   * @param remoteFiles 远程文件列表
   * @param remoteApiPath 远程基准路径
   * @param replacPath 替换的目录,例: `\\crystelf\\meme`
   * @private
   */
  public async compareAndDownloadFiles(
    localPath: string,
    localFiles: string[],
    remoteFiles: any[],
    remoteApiPath: string,
    replacPath: string,
  ) {
    const remoteBasePath = this.configService.get(`OPENLIST_API_BASE_PATH`) as
      | string
      | undefined;

    const normalizedLocalFiles = localFiles.map((f) =>
      path.normalize(f).replace(/\\/g, '/'),
    );

    const remoteApiNorm = (remoteApiPath || '')
      .replace(/\\/g, '/')
      .replace(/\/+$/, '');
    const remoteBaseNorm = (remoteBasePath || '')
      .replace(/\\/g, '/')
      .replace(/\/+$/, '');
    let replacPathNorm = (replacPath || '').replace(/\\/g, '/');
    if (replacPathNorm && !replacPathNorm.startsWith('/'))
      replacPathNorm = '/' + replacPathNorm;
    replacPathNorm = replacPathNorm.replace(/\/+$/, '');

    for (const remoteFile of remoteFiles) {
      const rawRemotePath = String(remoteFile.path || '').replace(/\\/g, '/');

      let remoteRelativePath = '';

      if (remoteBaseNorm && rawRemotePath.startsWith(remoteBaseNorm)) {
        remoteRelativePath = rawRemotePath.slice(remoteBaseNorm.length);
      } else if (remoteApiNorm && rawRemotePath.includes(remoteApiNorm)) {
        remoteRelativePath = rawRemotePath.slice(
          rawRemotePath.indexOf(remoteApiNorm),
        );
      } else {
        const rel = path.posix.relative(remoteApiNorm || '/', rawRemotePath);
        remoteRelativePath = rel ? '/' + rel.replace(/\/+/g, '/') : '/';
      }

      remoteRelativePath = remoteRelativePath.replace(/\/+/g, '/');
      if (!remoteRelativePath.startsWith('/'))
        remoteRelativePath = '/' + remoteRelativePath;

      let localRelative = remoteRelativePath;
      if (replacPathNorm && localRelative.startsWith(replacPathNorm)) {
        localRelative = localRelative.slice(replacPathNorm.length);
      } else if (replacPathNorm && localRelative.includes(replacPathNorm)) {
        localRelative = localRelative.replace(replacPathNorm, '');
      }
      localRelative = localRelative.replace(/\/+/g, '/').replace(/^\/+/, '');
      const localFilePathRaw = path.join(localPath, localRelative);
      const localFilePath = path.normalize(localFilePathRaw);
      const localFilePathForCompare = localFilePath.replace(/\\/g, '/');

      this.logger.debug(`replacPath: ${replacPath}`);
      this.logger.debug(`remoteBaseNorm: ${remoteBaseNorm}`);
      this.logger.debug(`rawRemotePath: ${rawRemotePath}`);
      this.logger.debug(`remoteRelativePath: ${remoteRelativePath}`);
      this.logger.debug(`localRelative: ${localRelative}`);
      this.logger.debug(`localFilePath: ${localFilePathForCompare}`);

      if (remoteFile.is_dir) {
        try {
          const subRemote =
            await this.openListService.listFiles(remoteRelativePath);
          if (subRemote.code === 200 && subRemote.data?.content) {
            await this.compareAndDownloadFiles(
              localPath,
              normalizedLocalFiles,
              subRemote.data.content,
              remoteApiPath,
              replacPath,
            );
          }
        } catch (error) {
          this.logger.error(`递归处理文件夹失败: ${localFilePath}`, error);
        }
      } else {
        if (!normalizedLocalFiles.includes(localFilePathForCompare)) {
          this.logger.log(`文件缺失: ${localFilePath}, 开始下载..`);
          try {
            await fs.mkdir(path.dirname(localFilePath), { recursive: true });
            await this.openListService.downloadFile(
              remoteRelativePath,
              localFilePath,
            );
            this.logger.log(`文件下载成功: ${localFilePath}`);
            normalizedLocalFiles.push(localFilePathForCompare);
          } catch (error) {
            this.logger.error(`下载文件失败: ${localFilePath}`, error);
          }
        } else {
          this.logger.log('本地文件已是最新..');
        }
      }
    }
  }

  /**
   * 获取本地目录的文件列表
   * @param dir 本地路径
   * @private
   */
  public async getLocalFileList(dir: string): Promise<string[]> {
    const files: string[] = [];
    const dirs: string[] = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          dirs.push(fullPath);
        } else {
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
}
