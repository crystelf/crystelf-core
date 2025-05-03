import path from 'path';
import paths from './path';
import fs from 'fs';
import logger from './logger';

const restartFile = path.join(paths.get('temp'), 'restart.timestamp');
class System {
  /**
   * 重启前保存时间戳
   */
  private static markRestartTime() {
    const now = Date.now();
    fs.writeFileSync(restartFile, now.toString(), 'utf-8');
  }

  /**
   * 检查重启时间戳
   */
  public static checkRestartTime() {
    if (fs.existsSync(restartFile)) {
      const prev = Number(fs.readFileSync(restartFile, 'utf-8'));
      const duration = ((Date.now() - prev) / 1000 - 5).toFixed(2);
      fs.unlinkSync(restartFile);
      return Number(duration);
    }
    return null;
  }

  /**
   * 重启服务
   */
  public static async restart() {
    this.markRestartTime();
    logger.warn('服务即将重启..');
    await new Promise((r) => setTimeout(r, 300));
    process.exit(0);
  }
}

export default System;
