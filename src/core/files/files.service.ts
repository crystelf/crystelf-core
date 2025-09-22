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
    const remoteBasePath = this.configService.get(`OPENLIST_API_BASE_PATH`);
    const normalizedLocalFiles = localFiles.map((f) =>
      path.normalize(f).replace(/\\/g, '/'),
    );
    for (const remoteFile of remoteFiles) {
      let relativePath = path.relative(remoteApiPath, remoteFile.path);
      //this.logger.debug(`relativePath: ${relativePath}`);
      //this.logger.debug(remoteBasePath);
      if (remoteBasePath) {
        let remoteRelativePath = relativePath.replace(remoteBasePath, ''); //服务器下载用目录
        //this.logger.debug(`remoteRelativePath: ${remoteRelativePath}`); //√\
        remoteRelativePath = path
          .normalize(remoteRelativePath)
          .replace(/\\/g, '/');
        replacPath = path.normalize(replacPath).replace(/\\/g, '/');
        relativePath = remoteRelativePath.replace(replacPath, ''); //本地储存用
        this.logger.debug(`replacPath: ${relativePath}`);
        relativePath = path.normalize(relativePath).replace(/\\/g, '/');
        this.logger.debug(`relativePathEd: ${relativePath}`);
        const localFilePath = path
          .normalize(path.join(localPath, relativePath))
          .replace(/\\/g, '/');
        //this.logger.debug(`localFilePath: ${localFilePath}`);
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
                normalizedLocalFiles,
                subRemoteFiles.data.content,
                remoteApiPath,
                replacPath,
              );
            }
          } catch (error) {
            this.logger.error(`递归处理文件夹失败: ${localFilePath}`, error);
          }
        } else {
          const normalizedLocalFiles = localFiles.map((f) =>
            path.normalize(f).replace(/\\/g, '/'),
          );
          //this.logger.debug(
          //`normalizedLocalFiles: ${JSON.stringify(normalizedLocalFiles)}`,
          //);

          if (!normalizedLocalFiles.includes(localFilePath)) {
            this.logger.log(`文件缺失: ${localFilePath}, 开始下载..`);
            try {
              await this.openListService.downloadFile(
                remoteRelativePath,
                localFilePath,
              );
              this.logger.log(`文件下载成功: ${localFilePath}`);
              normalizedLocalFiles.push(localFilePath);
              this.logger.debug(
                `localFilePath: ${JSON.stringify(normalizedLocalFiles)}`,
              );
            } catch (error) {
              this.logger.error(`下载文件失败: ${localFilePath}`, error);
            }
          } else {
            this.logger.log('本地文件已是最新..');
          }
        }
      } else {
        this.logger.error(`未配置远程根路径..`);
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
