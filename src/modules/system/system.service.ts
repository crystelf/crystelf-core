import System from '../../utils/core/system';
import fs from 'fs';
import logger from '../../utils/core/logger';
import path from 'path';
import paths from '../../utils/core/path';

class SystemService {
  public async systemRestart() {
    logger.debug(`有个小可爱正在请求重启核心..`);
    await System.restart();
  }

  public async getRestartTime() {
    logger.debug(`有个小可爱想知道核心重启花了多久..`);
    const restartTimePath = path.join(paths.get('temp'), 'restart_time');
    return fs.readFileSync(restartTimePath, 'utf8');
  }
}

export default new SystemService();
