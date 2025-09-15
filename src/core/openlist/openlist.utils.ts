import axios from 'axios';
import { AppConfigService } from '../../config/config.service';
import { Inject, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export class OpenListUtils {
  private static readonly logger = new Logger(OpenListUtils.name);
  private static apiBaseUrl: string | undefined;

  static init(@Inject(AppConfigService) configService: AppConfigService) {
    this.apiBaseUrl = configService.get('OPENLIST_API_BASE_URL');
  }

  /**
   * 获取 JWT Token
   * @param username 用户名
   * @param password 密码
   * @returns token
   */
  static async getToken(username: string, password: string): Promise<string> {
    const url = `${this.apiBaseUrl}/auth/token`;
    const hashedPassword = this.hashPassword(password);

    try {
      const response = await axios.post(url, {
        username,
        password: hashedPassword,
      });
      const token = response.data.token;
      this.logger.log(`获取 Token 成功: ${token}`);
      return token;
    } catch (error) {
      this.logger.error('获取 Token 失败', error);
      throw new Error('获取 Token 失败');
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
      this.logger.log('获取用户信息成功');
      return response.data;
    } catch (error) {
      this.logger.error('获取用户信息失败', error);
      throw new Error('获取用户信息失败');
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
      this.logger.log('列出目录成功');
      return response.data;
    } catch (error) {
      this.logger.error('列出目录失败', error);
      throw new Error('列出目录失败');
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
      this.logger.log('获取文件信息成功');
      return response.data;
    } catch (error) {
      this.logger.error('获取文件信息失败', error);
      throw new Error('获取文件信息失败');
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
      this.logger.error('文件重命名失败', error);
      throw new Error('文件重命名失败');
    }
  }

  /**
   * 为密码生成 sha256 hash
   * @param password 密码
   * @returns hashed 密码
   */
  private static hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }
}
