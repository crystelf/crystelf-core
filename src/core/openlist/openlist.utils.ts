import axios from 'axios';
import { AppConfigService } from '../../config/config.service';
import { Inject, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import { FileInfo, FileUpload, FsList } from './openlist.types';
import * as path from 'node:path';

export class OpenListUtils {
  private static readonly logger = new Logger(OpenListUtils.name);
  private static apiBaseUrl: string | undefined;

  static init(@Inject(AppConfigService) configService: AppConfigService) {
    this.apiBaseUrl = configService.get('OPENLIST_API_BASE_URL');
    this.logger.log('OpenListUtils初始化..');
  }

  /**
   * 获取 JWT Token
   * @param username 用户名
   * @param password 密码
   * @returns token
   */
  static async getToken(username: string, password: string): Promise<string> {
    const url = `${this.apiBaseUrl}/api/auth/login`;

    try {
      const response = await axios.post(url, {
        username: username,
        password: password,
      });
      //this.logger.debug(response);
      if (response.data.data.token) {
        const token: string = response.data.data.token;
        this.logger.debug(`获取Token成功: ${token}`);
        return token;
      } else {
        this.logger.error(`获取Token失败: ${response.data.data.message}`);
        return 'null';
      }
    } catch (error) {
      this.logger.error('获取Token失败..', error);
      throw new Error('获取Token失败..');
    }
  }

  /**
   * 获取目录列表
   * @param token 用户 Token
   * @param path 目录路径
   */
  static async listDirectory(token: string, path: string): Promise<FsList> {
    const url = `${this.apiBaseUrl}/api/fs/list`;
    try {
      let data = JSON.stringify({
        path: path,
      });
      //this.logger.debug(path);
      let config = {
        method: 'post',
        url: `${url}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${token}`,
        },
        data: data,
      };
      let response = await axios(config);
      this.logger.log(`列出目录${path}成功..`);
      return response.data;
    } catch (error) {
      this.logger.error(`列出目录${path}失败..`, error);
      throw new Error(`列出目录${path}失败..`);
    }
  }

  /**
   * 获取某个文件的详细信息
   * @param token 用户 Token
   * @param filePath 文件路径
   */
  static async getFileInfo(token: string, filePath: string): Promise<FileInfo> {
    const url = `${this.apiBaseUrl}/api/fs/get`;
    try {
      let data = JSON.stringify({
        path: filePath,
      });

      let config = {
        method: 'post',
        url: `${url}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${token}`,
        },
        data: data,
      };
      const response = await axios(config);
      this.logger.log('获取文件信息成功..');
      return response.data;
    } catch (error) {
      this.logger.error('获取文件信息失败..', error);
      throw new Error('获取文件信息失败..');
    }
  }

  /**
   * 下载文件
   * @param token 用户 Token
   * @param filePath 文件路径
   * @param downloadPath 本地下载路径
   */
  static async downloadFile(
    token: string,
    filePath: string,
    downloadPath: string,
  ): Promise<void> {
    try {
      const fileInfo = await this.getFileInfo(token, filePath);
      //this.logger.debug(fileInfo);
      const rawUrl = fileInfo.data.raw_url;
      //this.logger.debug(`rawUrl: ${rawUrl}`);
      if (!rawUrl) {
        this.logger.error('文件没有找到 raw_url 地址..');
        throw new Error('文件没有找到 raw_url 地址..');
      }
      const dir = path.dirname(downloadPath);
      await fsp.mkdir(dir, { recursive: true });
      const response = await axios.get(rawUrl, { responseType: 'stream' });
      const writer = fs.createWriteStream(downloadPath);
      response.data.pipe(writer);
      await new Promise<void>((resolve, reject) => {
        writer.on('finish', () => {
          this.logger.log(`文件下载成功: ${downloadPath}`);
          resolve();
        });
        writer.on('error', (error) => {
          this.logger.error('下载文件失败', error);
          reject(new Error('下载文件失败..'));
        });
      });
    } catch (error) {
      this.logger.error('下载文件失败..', error);
      throw new Error('下载文件失败..');
    }
  }

  /**
   * 流式上传文件
   * @param token 用户 Token
   * @param filePath 上传文件的路径
   * @param filePathOnServer 服务器上保存的文件路径
   * @param file 文件流
   */
  static async uploadFile(
    token: string,
    filePath: string,
    filePathOnServer: string,
    file: fs.ReadStream,
  ): Promise<FileUpload> {
    const url = `${this.apiBaseUrl}/api/fs/put`;
    const headers = {
      Authorization: `${token}`,
      'Content-Type': 'application/octet-stream',
      'Content-Length': file.bytesRead,
      'File-Path': encodeURIComponent(filePathOnServer),
    };

    try {
      const response = await axios.put(url, file, {
        headers,
        params: {
          path: filePath,
          'As-Task': 'true', //作为任务
        },
      });
      this.logger.log(`文件上传成功: ${filePathOnServer}`);
      return response.data;
    } catch (error) {
      this.logger.error('上传文件失败..', error);
      throw new Error('上传文件失败..');
    }
  }
}
