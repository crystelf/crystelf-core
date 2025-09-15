import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/config.service';
import { FileInfo, FsList } from './openlist.types';
import { OpenListUtils } from './openlist.utils';
import * as moment from 'moment';

@Injectable()
export class OpenListService {
  private readonly logger = new Logger(OpenListService.name);
  private token: string | undefined;
  private tokenExpireTime: moment.Moment | undefined;

  constructor(
    @Inject(AppConfigService)
    private readonly configService: AppConfigService,
  ) {
    this.initialize().then();
  }

  /**
   * 服务初始化
   */
  private async initialize() {
    const apiBaseUrl = this.configService.get('OPENLIST_API_BASE_URL');
    const username = this.configService.get('OPENLIST_API_BASE_USERNAME');
    const password = this.configService.get('OPENLIST_API_BASE_PASSWORD');

    OpenListUtils.init(this.configService);
    if (username && password) {
      this.token = await this.fetchToken(username, password);
      this.tokenExpireTime = moment().add(48, 'hours');
      this.logger.log(`OpenList服务初始化成功: ${apiBaseUrl}`);
    } else {
      this.logger.error(
        `OpenList服务初始化失败,请检查是否填写.env处的用户名和密码..`,
      );
    }
  }

  /**
   * 获取OpenList的JWT Token，如果Token已过期，则重新获取
   * @param username 用户名
   * @param password 密码
   * @returns JWT Token
   */
  private async fetchToken(
    username: string,
    password: string,
  ): Promise<string> {
    if (
      this.token &&
      this.tokenExpireTime &&
      moment().isBefore(this.tokenExpireTime)
    ) {
      return this.token;
    }
    try {
      const newToken = await OpenListUtils.getToken(username, password);
      this.tokenExpireTime = moment().add(48, 'hours'); //过期时间
      return newToken;
    } catch (error) {
      this.logger.error('获取Token失败:', error);
      throw new Error('获取Token失败');
    }
  }

  /**
   * 列出目录下的所有文件
   * @param path 目录路径
   * @returns 目录下的文件列表
   */
  public async listFiles(path: string): Promise<FsList> {
    try {
      const token = await this.fetchToken(
        <string>this.configService.get('OPENLIST_API_BASE_USERNAME'),
        <string>this.configService.get('OPENLIST_API_BASE_PASSWORD'),
      );
      return await OpenListUtils.listDirectory(token, path);
    } catch (error) {
      this.logger.error('列出目录失败:', error);
      throw new Error('列出目录失败');
    }
  }

  /**
   * 获取文件信息
   * @param filePath 文件路径
   * @returns 文件信息
   */
  public async getFileInfo(filePath: string): Promise<FileInfo> {
    try {
      const token = await this.fetchToken(
        <string>this.configService.get('OPENLIST_API_BASE_USERNAME'),
        <string>this.configService.get('OPENLIST_API_BASE_PASSWORD'),
      );
      return await OpenListUtils.getFileInfo(token, filePath);
    } catch (error) {
      this.logger.error('获取文件信息失败:', error);
      throw new Error('获取文件信息失败');
    }
  }

  /**
   * 下载文件
   * @param filePath 文件路径
   * @param downloadPath 本地下载路径
   */
  public async downloadFile(
    filePath: string,
    downloadPath: string,
  ): Promise<void> {
    try {
      const token = await this.fetchToken(
        <string>this.configService.get('OPENLIST_API_BASE_USERNAME'),
        <string>this.configService.get('OPENLIST_API_BASE_PASSWORD'),
      );
      await OpenListUtils.downloadFile(token, filePath, downloadPath);
    } catch (error) {
      this.logger.error('下载文件失败:', error);
      throw new Error('下载文件失败');
    }
  }

  /**
   * 上传文件
   * @param filePath 上传路径
   * @param file 文件
   * @param filePathOnserver 服务器路径
   */
  public async uploadFile(
    filePath: string,
    file: any,
    filePathOnserver: string,
  ): Promise<void> {
    try {
      const token = await this.fetchToken(
        <string>this.configService.get('OPENLIST_API_BASE_USERNAME'),
        <string>this.configService.get('OPENLIST_API_BASE_PASSWORD'),
      );
      await OpenListUtils.uploadFile(token, filePath, filePathOnserver, file);
    } catch (error) {
      this.logger.error('上传文件失败:', error);
      throw new Error('上传文件失败');
    }
  }
}
