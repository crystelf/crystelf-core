import wsClientManager from '../../services/ws/wsClientManager';
import logger from '../../utils/core/logger';

class TestService {
  public async test() {
    try {
      const testData = {
        type: 'getGroupInfo',
        data: {
          botId: 'stdin',
          groupId: 'stdin',
        },
      };
      return await wsClientManager.sendAndWait('test', testData);
    } catch (err) {
      logger.error(err);
    }
  }
}

export default new TestService();
