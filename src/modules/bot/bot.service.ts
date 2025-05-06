import logger from '../../utils/core/logger';
import paths from '../../utils/core/path';
import fs from 'fs/promises';
import path from 'path';
import redisService from '../../services/redis/redis';

class BotService {
  /**
   * 获取botId数组
   */
  public async getBotId() {
    logger.debug('GetBotId..');
    const userPath = paths.get('userData');
    const botsPath = path.join(userPath, '/crystelfBots');
    const dirData = await fs.readdir(botsPath);
    const uins: { uin: string; nickName: string }[] = [];

    for (const fileName of dirData) {
      if (!fileName.endsWith('.json')) continue;

      try {
        const raw: [] | undefined = await redisService.fetch('crystelfBots', fileName);
        if (!raw) continue;

        let botList: any[];
        try {
          botList = raw;
          if (!Array.isArray(botList)) {
            logger.warn(`${fileName}不是数组，已跳过`);
            continue;
          }
        } catch (e) {
          logger.warn(`解析 ${fileName} 出错: ${e}`);
          continue;
        }
        for (const bot of botList) {
          if (bot.uin && bot.nickName) {
            uins.push({ uin: bot.uin, nickName: bot.nickName });
          }
        }
      } catch (err) {
        logger.error(`读取或解析 ${fileName} 出错: ${err}`);
      }
    }
    logger.debug(uins);
    return uins;
  }
}

export default new BotService();
