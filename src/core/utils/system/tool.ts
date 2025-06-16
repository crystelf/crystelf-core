import RetryOptions from '../../types/retry';
import logger from './logger';

let tools = {
  /**
   * 异步重试机制
   * @param operation
   * @param options
   */
  async retry(operation: () => Promise<any>, options: RetryOptions): Promise<any> {
    let attempt = 0;
    let lastError: any;

    while (attempt < options.maxAttempts) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        attempt++;

        if (attempt < options.maxAttempts) {
          const delay = options.initialDelay * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    logger.error(lastError);
  },

  /**
   * 从一个可迭代列表中随机选择一个对象
   * @param list 可迭代数据
   */
  getRandomItem<T>(list: T[]): T {
    return list[Math.floor(Math.random() * list.length)];
  },

  /**
   * 获取随机数
   * @param min 最小值
   * @param max 最大值
   */
  getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
};

export default tools;
