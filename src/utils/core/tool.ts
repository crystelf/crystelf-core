import RetryOptions from '../../types/retry';
import logger from './logger';

let tools = {
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
};

export default tools;
