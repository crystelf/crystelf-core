import logger from '../../utils/core/logger';

class SampleService {
  getHello() {
    logger.debug(`有个小可爱正在请求GetHello方法..`);
    return { message: 'Hello World!' };
  }

  generateGreeting(name: string): object {
    logger.debug(`有个小可爱正在请求generateGreeting方法..`);
    if (!name) {
      logger.warn('Name is required');
      throw new Error('Name is required');
    }
    return { message: `Hello, ${name}!` };
  }
}

export default new SampleService();
