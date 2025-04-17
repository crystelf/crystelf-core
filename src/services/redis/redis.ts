import Redis from 'ioredis';
import logger from '../../utils/core/logger';
import tools from '../../utils/core/tool';
import config from '../../utils/core/config';
import redisTools from '../../utils/redis/redisTools';
import Persistence from '../../utils/redis/persistence';
import IUser from '../../types/user';

class RedisService {
  private client!: Redis;
  private isConnected = false;

  constructor() {
    this.initialize().then();
  }

  private async initialize() {
    await this.connectWithRetry();
    this.setupEventListeners();
    //await this.test();
  }

  private async connectWithRetry(): Promise<void> {
    try {
      await tools.retry(
        async () => {
          this.client = new Redis({
            host: config.get('RD_ADD'),
            port: Number(config.get('RD_PORT')),
            retryStrategy: (times) => {
              return Math.min(times * 1000, 5000);
            },
          });

          await this.client.ping();
          this.isConnected = true;
          logger.info(`Redis连接成功!位于${config.get('RD_ADD')}:${config.get('RD_PORT')}`);
        },
        {
          maxAttempts: 5,
          initialDelay: 1000,
        }
      );
    } catch (error) {
      logger.error('Redis连接失败:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    this.client.on('error', (err) => {
      if (!err.message.includes('ECONNREFUSED')) {
        logger.error('Redis错误:', err);
      }
      this.isConnected = false;
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      logger.debug('Redis连接就绪!');
    });

    this.client.on('reconnecting', () => {
      logger.warn('Redis重新连接中...');
    });
  }

  public async waitUntilReady(): Promise<void> {
    if (this.isConnected) return;

    return new Promise((resolve) => {
      const check = () => {
        if (this.isConnected) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  public getClient(): Redis {
    if (!this.isConnected) {
      logger.fatal(1, 'Redis未连接..');
    }
    return this.client;
  }

  public async disconnect(): Promise<void> {
    await this.client.quit();
    this.isConnected = false;
  }

  public async setObject<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = redisTools.serialize(value);
    await this.getClient().set(key, serialized);

    if (ttl) {
      await this.getClient().expire(key, ttl);
    }
  }

  public async getObject<T>(key: string): Promise<T | undefined> {
    const serialized = await this.getClient().get(key);
    if (!serialized) return undefined;

    const deseralized = redisTools.deserialize<T>(serialized);
    return redisTools.reviveDates(deseralized);
  }

  public async update<T>(key: string, updates: T): Promise<T> {
    const existing = await this.getObject<T>(key);
    if (!existing) {
      logger.error(`数据${key}不存在..`);
    }
    const updated = { ...existing, ...updates };
    await this.setObject(key, updated);
    return updated;
  }

  public async fetch<T>(key: string, fileName: string): Promise<T | undefined> {
    const data = await this.getObject<T>(key);
    if (data) return data;
    const fromLocal = await Persistence.readDataLocal<T>(key, fileName);
    if (fromLocal) {
      await this.setObject(key, fromLocal);
      return fromLocal;
    }
    logger.error(`数据${key}不存在..`);
  }

  public async persistData<T>(key: string, data: T, fileName: string): Promise<void> {
    await this.setObject(key, data);
    await Persistence.writeDataLocal(key, data, fileName);
    return;
  }

  public async test(): Promise<void> {
    const user = await this.fetch<IUser>('Jerry', 'IUser');
    logger.debug('User:', user);
  }
}

const redisService = new RedisService();
export default redisService;
