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

  /**
   * 设置Redis客户端事件监听器
   */
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

  /**
   * 获取Redis客户端实例
   * @returns {Redis} Redis客户端
   * @throws 如果未连接，则记录fatal日志
   */
  public getClient(): Redis {
    if (!this.isConnected) {
      logger.fatal(1, 'Redis未连接..');
    }
    return this.client;
  }

  /**
   * 断开Redis连接
   * @returns {Promise<void>}
   */
  public async disconnect(): Promise<void> {
    await this.client.quit();
    this.isConnected = false;
  }

  /**
   * 存储对象到Redis
   * @template T
   * @param {string} key Redis键
   * @param {T} value 要存储的对象
   * @param {number} [ttl] 过期时间（秒）
   */
  public async setObject<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = redisTools.serialize(value);
    await this.getClient().set(key, serialized);

    if (ttl) {
      await this.getClient().expire(key, ttl);
    }
  }

  /**
   * 从Redis获取对象
   * @template T
   * @param {string} key Redis键
   * @returns {Promise<T | undefined>} 获取到的对象或undefined
   */
  public async getObject<T>(key: string): Promise<T | undefined> {
    const serialized = await this.getClient().get(key);
    if (!serialized) return undefined;

    const deserialized = redisTools.deserialize<T>(serialized);
    return redisTools.reviveDates(deserialized);
  }

  /**
   * 更新Redis中已存在的对象
   * @template T
   * @param {string} key Redis键
   * @param {T} updates 更新内容
   * @returns {Promise<T>} 更新后的对象
   */
  public async update<T>(key: string, updates: T): Promise<T> {
    const existing = await this.getObject<T>(key);
    if (!existing) {
      logger.error(`数据${key}不存在..`);
    }
    const updated = { ...existing, ...updates };
    await this.setObject(key, updated);
    return updated;
  }

  /**
   * 从Redis或本地文件获取数据
   * @template T
   * @param {string} key Redis键
   * @param {string} fileName 本地文件名
   * @returns {Promise<T | undefined>} 获取到的数据或undefined
   */
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

  /**
   * 将数据持久化到Redis和本地文件
   * @template T
   * @param {string} key Redis键
   * @param {T} data 要持久化的数据
   * @param {string} fileName 本地文件名
   */
  public async persistData<T>(key: string, data: T, fileName: string): Promise<void> {
    await this.setObject(key, data);
    await Persistence.writeDataLocal(key, data, fileName);
    return;
  }

  /**
   * 测试方法：示例性地获取一个用户数据
   */
  public async test(): Promise<void> {
    const user = await this.fetch<IUser>('Jerry', 'IUser');
    logger.debug('User:', user);
  }
}

const redisService = new RedisService();
export default redisService;
