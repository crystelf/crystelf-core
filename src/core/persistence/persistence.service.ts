import { Inject, Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import { PathService } from '../path/path.service';
import { FilesService } from '../files/files.service';

@Injectable()
export class PersistenceService {
  private readonly logger = new Logger(PersistenceService.name);

  private getDataPath(dataName: string, fileName: string): string {
    return path.join(this.paths.get('userData'), dataName, `${fileName}.json`);
  }

  constructor(
    @Inject(PathService)
    private readonly paths: PathService,
    @Inject(FilesService)
    private readonly fileService: FilesService,
  ) {}

  private async ensureDataPath(dataName: string): Promise<void> {
    const dataPath = path.join(this.paths.get('userData'), dataName);
    try {
      await this.fileService.createDir(dataPath, false);
    } catch (err) {
      this.logger.error('目录创建失败:', err);
    }
  }

  /**
   * 将数据保存到本地 带格式化
   * @param dataName 数据名 -> 文件夹名
   * @param data 内容
   * @param fileName 文件名
   */
  public async writeDataLocal<T>(
    dataName: string,
    data: T,
    fileName: string,
  ): Promise<void> {
    await this.ensureDataPath(dataName);
    const filePath = this.getDataPath(dataName, fileName);

    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
      this.logger.debug(`用户数据已持久化到本地: ${filePath}`);
    } catch (err) {
      this.logger.error('写入失败:', err);
    }
  }

  /**
   * 从本地读取数据 带解析
   * @param dataName 数据名 -> 文件夹名
   * @param fileName 文件名
   */
  public async readDataLocal<T>(
    dataName: string,
    fileName: string,
  ): Promise<T | undefined> {
    const filePath = this.getDataPath(dataName, fileName);

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data) as T;
    } catch (err) {
      this.logger.error('读取失败:', err);
      return undefined;
    }
  }
}
