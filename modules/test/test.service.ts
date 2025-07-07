import wsClientManager from '../../core/services/ws/wsClientManager';
import logger from '../../core/utils/system/logger';

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
