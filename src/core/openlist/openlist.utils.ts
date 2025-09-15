import axios from 'axios';
import { AppConfigService } from '../../config/config.service';
import { Inject, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';

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
      this.logger.debug(response);
      if (response.data.data.token) {
        const token: string = response.data.data.token;
        this.logger.log(`获取Token成功: ${token}`);
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
   * 获取当前用户信息
   * @param token 用户 Token
   * @returns 用户信息
   */
  static async getUserInfo(token: string): Promise<any> {
    const url = `${this.apiBaseUrl}/auth/userinfo`;

    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      this.logger.log('获取用户信息成功..');
      return response.data;
    } catch (error) {
      this.logger.error('获取用户信息失败..', error);
      throw new Error('获取用户信息失败..');
    }
  }

  /**
   * 获取目录列表
   * @param token 用户 Token
   * @param path 目录路径
   * @returns 文件目录列表
   */
  static async listDirectory(token: string, path: string): Promise<any> {
    const url = `${this.apiBaseUrl}/fs/list`;

    try {
      const response = await axios.get(url, {
        params: { path },
        headers: { Authorization: `Bearer ${token}` },
      });
      this.logger.log('列出目录成功..');
      return response.data;
    } catch (error) {
      this.logger.error('列出目录失败..', error);
      throw new Error('列出目录失败..');
    }
  }

  /**
   * 获取某个文件的详细信息
   * @param token 用户 Token
   * @param filePath 文件路径
   * @returns 文件信息
   */
  static async getFileInfo(token: string, filePath: string): Promise<any> {
    const url = `${this.apiBaseUrl}/fs/info`;

    try {
      const response = await axios.get(url, {
        params: { path: filePath },
        headers: { Authorization: `Bearer ${token}` },
      });
      this.logger.log('获取文件信息成功..');
      return response.data;
    } catch (error) {
      this.logger.error('获取文件信息失败..', error);
      throw new Error('获取文件信息失败..');
    }
  }

  /**
   * 文件重命名
   * @param token 用户 Token
   * @param oldPath 旧路径
   * @param newPath 新路径
   * @returns 重命名结果
   */
  static async renameFile(
    token: string,
    oldPath: string,
    newPath: string,
  ): Promise<any> {
    const url = `${this.apiBaseUrl}/fs/rename`;

    try {
      const response = await axios.post(
        url,
        { oldPath, newPath },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      this.logger.log(`文件重命名成功: ${oldPath} => ${newPath}`);
      return response.data;
    } catch (error) {
      this.logger.error('文件重命名失败..', error);
      throw new Error('文件重命名失败..');
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
    const url = `${this.apiBaseUrl}/fs/download`;

    try {
      const response = await axios.get(url, {
        params: { path: filePath },
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'stream',
      });
      const writer = fs.createWriteStream(downloadPath);
      response.data.pipe(writer);

      writer.on('finish', () => {
        this.logger.log(`文件下载成功: ${downloadPath}`);
      });

      writer.on('error', (error) => {
        this.logger.error('下载文件失败', error);
        throw new Error('下载文件失败');
      });
    } catch (error) {
      this.logger.error('下载文件失败..', error);
      throw new Error('下载文件失败..');
    }
  }

  /**
   * 上传文件
   * @param token 用户 Token
   * @param filePath 上传文件的路径
   * @param file 上传文件的内容
   * @returns 上传结果
   */
  static async uploadFile(
    token: string,
    filePath: string,
    file: any,
  ): Promise<any> {
    const url = `${this.apiBaseUrl}/fs/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', filePath);

    try {
      const response = await axios.post(url, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      this.logger.log(`文件上传成功: ${filePath}`);
      return response.data;
    } catch (error) {
      this.logger.error('上传文件失败..', error);
      throw new Error('上传文件失败..');
    }
  }

  /**
   * 获取某个目录下的所有文件
   * @param token 用户 Token
   * @param directoryPath 目录路径
   * @returns 文件列表
   */
  static async listFilesInDirectory(
    token: string,
    directoryPath: string,
  ): Promise<any[]> {
    const directoryInfo = await this.listDirectory(token, directoryPath);
    return directoryInfo.filter(
      (item: { is_directory: any }) => !item.is_directory,
    );
  }

  /**
   * 检查文件更新
   * @param token 用户 Token
   * @param filePath 文件路径
   * @param lastModified 上次改动时间
   * @returns 文件是否更新
   */
  static async checkFileUpdate(
    token: string,
    filePath: string,
    lastModified: string,
  ): Promise<boolean> {
    const fileInfo = await this.getFileInfo(token, filePath);
    return fileInfo.modified_at !== lastModified;
  }
}
