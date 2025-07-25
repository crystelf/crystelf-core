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

  async onModuleInit() {
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
      this.logger.debug('Redis连接就绪!');
    });

    this.client.on('reconnecting', () => {
      this.logger.warn('Redis重新连接中...');
    });
  }

  public async waitUntilReady(): Promise<void> {
    if (this.isConnected) return;
    return new Promise((resolve) => {
      const check = () =>
        this.isConnected ? resolve() : setTimeout(check, 100);
      check();
    });
  }

  public getClient(): Redis {
    if (!this.isConnected) {
      this.logger.error('Redis未连接');
    }
    return this.client;
  }

  public async disconnect(): Promise<void> {
    await this.client.quit();
    this.isConnected = false;
  }

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

  public async getObject<T>(key: string): Promise<T | undefined> {
    const serialized = await this.client.get(key);
    if (!serialized) return undefined;
    const deserialized = RedisUtils.deserialize<T>(serialized);
    return RedisUtils.reviveDates(deserialized);
  }

  public async update<T>(key: string, updates: T): Promise<T> {
    const existing = await this.getObject<T>(key);
    if (!existing) {
      this.logger.error(`数据${key}不存在`);
    }
    const updated = { ...existing, ...updates };
    await this.setObject(key, updated);
    return updated;
  }

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

  public async persistData<T>(
    key: string,
    data: T,
    fileName: string,
  ): Promise<void> {
    await this.setObject(key, data);
    await this.Persistence.writeDataLocal(key, data, fileName);
  }

  public async test(): Promise<void> {
    const user = await this.fetch<IUser>('Jerry', 'IUser');
    this.logger.debug('User:', user);
  }
}
