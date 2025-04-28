import logger from '../../utils/core/logger';
import paths from '../../utils/core/path';
import fs from 'fs/promises';
import path from 'path';

class BotService {
  public async getBotId() {
    logger.debug('GetBotId..');
    const userPath = paths.get('userData');
    const botsPath = path.join(userPath, '/crystelfBots');
    const dirData = await fs.readdir(botsPath);
    const uins: string[] = [];

    for (const fileName of dirData) {
      if (!fileName.endsWith('.json')) {
        continue;
      }
      try {
        const filePath = path.join(botsPath, fileName);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const jsonData = JSON.parse(fileContent);
        if (jsonData.uin) {
          uins.push(jsonData.uin);
        }
      } catch (e) {
        logger.error(`读取或解析${fileName}出错`);
      }
    }
    return uins;
  }
}

export default new BotService();
