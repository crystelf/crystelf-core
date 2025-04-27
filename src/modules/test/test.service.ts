import wsServer from '../../services/ws/wsServer';
import wsClientManager from '../../services/ws/wsClientManager';
import logger from '../../utils/core/logger';

class TestService {
  public async test() {
    try {
      const testData = { type: 'test', data: '114514' };
      await wsClientManager.send('test', JSON.stringify(testData));
      return { message: 'ok' };
    } catch (err) {
      logger.error(err);
    }
  }
}

export default new TestService();
