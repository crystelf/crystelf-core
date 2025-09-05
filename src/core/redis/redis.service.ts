import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisUtils } from './redis.utils';
import { AppConfigService } from '../../config/config.service';
import { ToolsService } from '../tools/tools.service';
import IUser from '../../types/user';
import { PersistenceService } from '../persistence/persistence.service';

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private isConnected = false;

  constructor(
    @Inject(AppConfigService)
    private readonly config: AppConfigService,
    @Inject(ToolsService)
    private readonly tools: ToolsService,
    @Inject(PersistenceService)
    private readonly Persistence: PersistenceService,
  ) {}

  public async onModuleInit() {
    await this.connectWithRetry();
    this.setupEventListeners();
  }

  private async connectWithRetry(): Promise<void> {
    try {
      await this.tools.retry(
        async () => {
          this.client = new Redis({
            host: this.config.get('RD_ADD'),
            port: Number(this.config.get('RD_PORT')),
            retryStrategy: (times: number) => Math.min(times * 1000, 5000),
          });

          await this.client.ping();
          this.isConnected = true;
          this.logger.log(
            `Redis连接成功! 位于 ${this.config.get('RD_ADD')}:${this.config.get('RD_PORT')}`,
          );
        },
        {
          maxAttempts: 5,
          initialDelay: 1000,
        },
      );
    } catch (error) {
      this.logger.error('Redis连接失败:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    this.client.on('error', (err) => {
      if (!err.message.includes('ECONNREFUSED')) {
        this.logger.error('Redis错误:', err);
      }
      this.isConnected = false;
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      this.logger.log('Redis连接就绪!');
    });

    this.client.on('reconnecting', () => {
      this.logger.warn('Redis重新连接中...');
    });
  }

  /**
   * 等待redis就绪
   */
  public async waitUntilReady(): Promise<void> {
    if (this.isConnected) return;
    return new Promise((resolve) => {
      const check = () =>
        this.isConnected ? resolve() : setTimeout(check, 100);
      check();
    });
  }

  /**
   * 获取单一redis实例
   */
  public getClient(): Redis {
    if (!this.isConnected) {
      this.logger.error('Redis未连接');
    }
    return this.client;
  }

  /**
   * 断开连接
   */
  public async disconnect(): Promise<void> {
    await this.client.quit();
    this.isConnected = false;
  }

  /**
   * 储存对象
   * @param key 键
   * @param value 键值
   * @param ttl 缓存时间
   */
  public async setObject<T>(
    key: string,
    value: T,
    ttl?: number,
  ): Promise<void> {
    const serialized = RedisUtils.serialize(value);
    await this.client.set(key, serialized);
    if (ttl) {
      await this.client.expire(key, ttl);
    }
  }

  /**
   * 从redis中获取对象
   * @param key 键
   */
  public async getObject<T>(key: string): Promise<T | undefined> {
    const serialized = await this.client.get(key);
    if (!serialized) return undefined;
    const deserialized = RedisUtils.deserialize<T>(serialized);
    return RedisUtils.reviveDates(deserialized);
  }

  /**
   * 更新redis中的呃对象
   * @param key
   * @param updates
   */
  public async update<T>(key: string, updates: T): Promise<T> {
    const existing = await this.getObject<T>(key);
    if (!existing) {
      this.logger.error(`数据${key}不存在`);
    }
    const updated = { ...existing, ...updates };
    await this.setObject(key, updated);
    return updated;
  }

  /**
   * 从本地或redis获取对象
   * @param key 键 / 文件夹名
   * @param fileName 文件名
   */
  public async fetch<T>(key: string, fileName: string): Promise<T | undefined> {
    const data = await this.getObject<T>(key);
    if (data) return data;

    const fromLocal = await this.Persistence.readDataLocal<T>(key, fileName);
    if (fromLocal) {
      await this.setObject(key, fromLocal);
      return fromLocal;
    }

    this.logger.error(`数据${key}不存在`);
  }

  /**
   * 保存对象
   * @param key 键
   * @param data 内容
   * @param fileName 文件名
   */
  public async persistData<T>(
    key: string,
    data: T,
    fileName: string,
  ): Promise<void> {
    await this.setObject(key, data);
    await this.Persistence.writeDataLocal(key, data, fileName);
  }

  /**
   * 增加某个 IP 的流量计数
   * @param ip IP 地址
   * @param bytes 本次传输的字节数
   * @param window 窗口秒数
   */
  public async incrementIpTraffic(
    ip: string,
    bytes: number,
    window = 1,
  ): Promise<number> {
    const key = `traffic:${ip}`;
    const total = await this.client.incrby(key, bytes);
    await this.client.expire(key, window);
    return total;
  }

  /**
   * 获取某个 IP 当前窗口的流量
   */
  public async getIpTraffic(ip: string): Promise<number> {
    const key = `traffic:${ip}`;
    const value = await this.client.get(key);
    return value ? parseInt(value, 10) : 0;
  }
}
