import dotenv from 'dotenv';
import logger from './logger';

class ConfigManger {
  private static instance: ConfigManger;
  private env: NodeJS.ProcessEnv;

  private constructor() {
    dotenv.config();
    this.env = process.env;
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ConfigManger {
    if (!ConfigManger.instance) {
      ConfigManger.instance = new ConfigManger();
    }
    return ConfigManger.instance;
  }

  /**
   * 获取环境变量（带类型推断）
   * @param key 环境变量键名
   * @param defaultValue 默认值（决定返回类型）
   */
  public get<T = string>(key: string, defaultValue?: T): T {
    const value = this.env[key];
    if (value === undefined) {
      if (defaultValue !== undefined) return defaultValue;
      logger.warn(`环境变量${key}未定义！`);
      return undefined as T;
    }

    switch (typeof defaultValue) {
      case 'number':
        return Number(value) as T;
      case 'boolean':
        return (value === 'true') as T;
      default:
        return value as T;
    }
  }

  /**
   * 设置环境变量（运行时有效）
   * @param key 键名
   * @param value 值
   */
  public set(key: string, value: string | number | boolean): void {
    this.env[key] = String(value);
    logger.debug(`成功更改环境变量${key}为${value}!`);
  }

  /**
   * 检查环境变量是否已加载
   */
  public check(keys: string[]): void {
    keys.forEach((key) => {
      if (!(key in this.env)) {
        logger.fatal(1, `必须环境变量缺失:${key}`);
      } else {
        logger.debug(`检测到环境变量${key}!`);
      }
    });
  }
}

const config = ConfigManger.getInstance();

export default config;
