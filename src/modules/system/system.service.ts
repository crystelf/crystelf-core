import System from '../../utils/core/system';
import fs from 'fs/promises';
import logger from '../../utils/core/logger';

class SystemService {
  public async systemRestart() {
    logger.debug(`有个小可爱正在请求重启核心..`);
    await System.restart();
  }

  public async getRestartTime() {
    logger.debug(`有个小可爱想知道核心重启花了多久..`);
    return await fs.readFile('/temp/restart_time', 'utf8');
  }
}

export default new SystemService();
