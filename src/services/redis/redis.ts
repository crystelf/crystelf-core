import Redis from 'ioredis';
import logger from '../../utils/core/logger';
import tools from '../../utils/core/tool';
import config from '../../utils/core/config';
import redisTool from '../../utils/redis/redisTools';
import IUser from '../../types/user';
import Persistence from '../../utils/redis/persistence';

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
    const serialized = redisTool.serialize(value);
    await this.getClient().set(key, serialized);

    if (ttl) {
      await this.getClient().expire(key, ttl);
    }
  }

  public async getObject<T>(key: string): Promise<T | undefined> {
    const serialized = await this.getClient().get(key);
    if (!serialized) return undefined;

    const deserialized = redisTool.deserialize<T>(serialized);
    return redisTool.reviveDates(deserialized);
  }

  public async updateUser(qq: string, updates: Partial<IUser>): Promise<IUser> {
    const existing = await this.getObject<IUser>(`user:${qq}`);
    if (!existing) {
      throw new Error(`用户 ${qq} 不存在`);
    }
    const updatedUser = { ...existing, ...updates, updatedAt: new Date() };
    await this.persistUser(updatedUser);
    return updatedUser;
  }

  public async persistUser<T extends IUser>(user: T): Promise<void> {
    try {
      await Promise.all([
        this.setObject(`user:${user.qq}`, user),
        Persistence.writeDataLocal(user.name, user),
      ]);
    } catch (err) {
      logger.error(err);
      throw err;
    }
  }

  public async fetchUser<T extends IUser>(
    qq: string,
    username: string
  ): Promise<IUser | undefined> {
    try {
      const fromRedis = await this.getObject<IUser>(`user:${qq}`);
      if (fromRedis) return fromRedis;

      const fromLocal = await Persistence.readDataLocal<IUser>(username);
      if (fromLocal) {
        await this.setObject(`user:${qq}`, fromLocal);
        return fromLocal;
      }

      logger.error(`用户${username},qq${qq}不存在！`);
      return undefined;
    } catch (err) {
      logger.error(err);
      throw err;
    }
  }

  public async test(): Promise<void> {
    const testData: IUser = {
      name: 'Jerry',
      qq: '114514',
      isAdmin: true,
      password: '114514',
      createdAt: new Date(),
    };

    await this.persistUser(testData);
    const user = await this.fetchUser('114514', 'Jerry');
    logger.debug(user);
  }
}

const redisService = new RedisService();
export default redisService;
