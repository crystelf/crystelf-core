import logger from '../../utils/core/logger';
import paths from '../../utils/core/path';
import fs from 'fs/promises';
import path from 'path';
import redisService from '../../services/redis/redis';
import wsClientManager from '../../services/ws/wsClientManager';
import tools from '../../utils/core/tool';

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
    //logger.debug(sendData);
    if (sendData.data.clientID) {
      const returnData = await wsClientManager.sendAndWait(sendData.data.clientID, sendData);
      if (returnData) {
        return returnData;
      } else {
        logger.warn(`未查询到${data.groupId}的信息..`);
        return undefined;
      }
    }
    return undefined;
  }

  /**
   * 发送消息到群聊
   * @param groupId 群号
   * @param message 消息
   */
  public async sendMessage(groupId: number, message: string): Promise<boolean> {
    logger.info(`发送${message}到${groupId}..`);
    const sendBot: number | undefined = await this.getGroupBot(groupId);
    if (!sendBot) {
      logger.warn(`不存在能向群聊${groupId}发送消息的Bot!`);
      return false;
    }
    const client = await this.getBotClient(sendBot);
    if (!client) {
      logger.warn(`不存${sendBot}对应的client!`);
      return false;
    }
    const sendData = {
      type: 'sendMessage',
      data: {
        botId: sendBot,
        groupId: groupId,
        clientId: client,
        message: message,
      },
    };
    if (client) {
      await wsClientManager.send(sendData.data.clientId, sendData);
      return true;
    }
    return false;
  }

  /**
   * 智能投放广播消息实现
   * @param message 要广播的消息
   */
  // TODO 添加群聊信誉分机制，低于30分的群聊不播报等..
  public async broadcastToAllGroups(message: string): Promise<void> {
    const userPath = paths.get('userData');
    const botsPath = path.join(userPath, '/crystelfBots');
    const dirData = await fs.readdir(botsPath);
    const groupMap: Map<number, { botId: number; clientId: string }[]> = new Map();

    for (const fileName of dirData) {
      if (!fileName.endsWith('.json')) continue;

      const clientId = path.basename(fileName, '.json');
      const botList = await redisService.fetch('crystelfBots', fileName);
      if (!Array.isArray(botList)) continue;
      if (!botList[0]) continue;
      for (const bot of botList) {
        if (!bot.uin || !bot.groups) continue;
        if (typeof bot.uin != 'number' || typeof bot.groups != 'number') continue;
        logger.debug(JSON.stringify(bot));
        for (const group of bot.groups) {
          if (!groupMap.has(group.group_id)) {
            groupMap.set(group.group_id, []);
          }
          groupMap.get(group.group_id)?.push({ botId: bot.uin, clientId });
        }
      }
    }

    for (const [groupId, botEntries] of groupMap.entries()) {
      logger.debug(`[群 ${groupId}] 候选Bot列表: ${JSON.stringify(botEntries)}`);
      const clientGroups = new Map<string, number[]>();
      botEntries.forEach(({ botId, clientId }) => {
        if (!clientGroups.has(clientId)) clientGroups.set(clientId, []);
        clientGroups.get(clientId)!.push(botId);
      });
      const selectedClientId = tools.getRandomItem([...clientGroups.keys()]);
      logger.debug(`[群 ${groupId}] 随机选中 Client: ${selectedClientId}`);
      const botCandidates = clientGroups.get(selectedClientId)!;
      logger.debug(`[群 ${groupId}] 该 Client 下候选 Bot: ${botCandidates}`);
      const selectedBotId = tools.getRandomItem(botCandidates);
      logger.debug(`[群 ${groupId}] 最终选中 Bot: ${selectedBotId}`);
      const delay = tools.getRandomDelay(10_000, 150_000);
      //解决闭包导致的变量覆盖问题
      ((groupId, selectedClientId, selectedBotId, delay) => {
        setTimeout(() => {
          const sendData = {
            type: 'sendMessage',
            data: {
              botId: selectedBotId,
              groupId: groupId,
              clientId: selectedClientId,
              message: message,
            },
          };
          logger.info(
            `[广播] 向群 ${groupId} 使用Bot ${selectedBotId}（客户端 ${selectedClientId}）发送消息${message}，延迟 ${delay / 1000} 秒`
          );
          wsClientManager.send(selectedClientId, sendData).catch((e) => {
            logger.error(`发送到群${groupId}失败:`, e);
          });
        }, delay);
      })(groupId, selectedClientId, selectedBotId, delay);
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
        if (raw.find((bot) => bot.uin == botId)) return path.basename(clientId, '.json');
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
