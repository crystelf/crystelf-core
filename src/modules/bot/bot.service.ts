import logger from '../../utils/core/logger';
import paths from '../../utils/core/path';
import fs from 'fs/promises';
import path from 'path';
import redisService from '../../services/redis/redis';
import wsClientManager from '../../services/ws/wsClientManager';

class BotService {
  /**
   * 获取botId数组
   */
  public async getBotId(): Promise<{ uin: number; nickName: string }[]> {
    logger.debug('GetBotId..');
    const userPath = paths.get('userData');
    const botsPath = path.join(userPath, '/crystelfBots');
    const dirData = await fs.readdir(botsPath);
    const uins: { uin: number; nickName: string }[] = [];

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
        botList.forEach((bot) => {
          //logger.debug(bot);
          if (bot.uin) {
            uins.push({ uin: bot.uin, nickName: bot.nickName });
          }
        });
      } catch (err) {
        logger.error(`读取或解析 ${fileName} 出错: ${err}`);
      }
    }
    logger.debug(uins);
    return uins;
  }

  /**
   * 获取群聊消息
   * @param data
   */
  public async getGroupInfo(data: {
    botId?: number;
    groupId: number;
    clientId?: string;
  }): Promise<any> {
    logger.debug('GetGroupInfo..');
    const sendBot: number | undefined = data.botId
      ? data.botId
      : await this.getGroupBot(data.groupId);
    if (!sendBot) {
      logger.warn(`不存在能向群聊${data.groupId}发送消息的Bot!`);
      return undefined;
    }
    let sendData = {
      type: 'getGroupInfo',
      data: {
        botId: sendBot,
        groupId: data.groupId,
        clientID: data.clientId ? data.clientId : await this.getBotClient(sendBot),
      },
    };
    const returnData = await wsClientManager.sendAndWait('test', sendData);
    if (returnData) {
      return returnData;
    } else {
      logger.warn(`未查询到${data.groupId}的信息..`);
      return undefined;
    }
  }

  /**
   * 获取`botId`对应的`client`
   * @param botId
   * @private
   */
  private async getBotClient(botId: number): Promise<string | undefined> {
    const userPath = paths.get('userData');
    const botsPath = path.join(userPath, '/crystelfBots');
    const dirData = await fs.readdir(botsPath);
    for (const clientId of dirData) {
      if (!clientId.endsWith('.json')) continue;
      try {
        const raw:
          | { uin: number; groups: { group_id: number; group_name: string }[]; nickName: string }[]
          | undefined = await redisService.fetch('crystelfBots', clientId);
        if (!raw) continue;
        if (raw.find((bot) => bot.uin == botId)) return clientId;
      } catch (err) {
        logger.error(`读取${clientId}出错..`);
      }
    }
    return undefined;
  }

  /**
   * 获取`groupId`对应的`botId`
   * @param groupId
   * @private
   */
  private async getGroupBot(groupId: number): Promise<number | undefined> {
    const userPath = paths.get('userData');
    const botsPath = path.join(userPath, '/crystelfBots');
    const dirData = await fs.readdir(botsPath);

    for (const clientId of dirData) {
      if (!clientId.endsWith('.json')) continue;

      try {
        const raw:
          | { uin: number; groups: { group_id: number; group_name: string }[]; nickName: string }[]
          | undefined = await redisService.fetch('crystelfBots', clientId);
        if (!raw) continue;

        for (const bot of raw) {
          if (bot.uin && bot.groups) {
            const found = bot.groups.find((group) => group.group_id == groupId);
            if (found) return bot.uin;
          }
        }
      } catch (err) {
        logger.error(`读取${clientId}出错..`);
      }
    }

    return undefined;
  }
}

export default new BotService();
