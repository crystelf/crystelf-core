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
        const raw = await redisService.fetch('crystelfBots', fileName);
        if (!raw || !Array.isArray(raw)) continue;

        for (const bot of raw) {
          const uin = Number(bot.uin);
          const nickName = bot.nickName || '';
          if (!isNaN(uin)) {
            uins.push({ uin, nickName });
          }
        }
      } catch (err) {
        logger.error(`读取或解析 ${fileName} 出错: ${err}`);
      }
    }
    logger.debug(uins);
    return uins;
  }

  /**
   * 获取群聊信息
   * @param data
   */
  public async getGroupInfo(data: {
    botId?: number;
    groupId: number;
    clientId?: string;
  }): Promise<any> {
    logger.debug('GetGroupInfo..');
    const sendBot: number | undefined = data.botId ?? (await this.getGroupBot(data.groupId));
    if (!sendBot) {
      logger.warn(`不存在能向群聊${data.groupId}发送消息的Bot!`);
      return undefined;
    }

    const sendData = {
      type: 'getGroupInfo',
      data: {
        botId: sendBot,
        groupId: data.groupId,
        clientID: data.clientId ?? (await this.getBotClient(sendBot)),
      },
    };

    if (sendData.data.clientID) {
      const returnData = await wsClientManager.sendAndWait(sendData.data.clientID, sendData);
      return returnData ?? undefined;
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
    const sendBot = await this.getGroupBot(groupId);
    if (!sendBot) {
      logger.warn(`不存在能向群聊${groupId}发送消息的Bot!`);
      return false;
    }
    const client = await this.getBotClient(sendBot);
    if (!client) {
      logger.warn(`不存在${sendBot}对应的client!`);
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
    await wsClientManager.send(client, sendData);
    return true;
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

      for (const bot of botList) {
        const botId = Number(bot.uin);
        const groups = bot.groups;

        if (!botId || !Array.isArray(groups)) continue;

        for (const group of groups) {
          if (group.group_id === '未知') continue;
          const groupId = Number(group.group_id);
          if (isNaN(groupId)) continue;

          if (!groupMap.has(groupId)) {
            groupMap.set(groupId, []);
          }
          groupMap.get(groupId)!.push({ botId, clientId });
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
      const botCandidates = clientGroups.get(selectedClientId)!;
      const selectedBotId = tools.getRandomItem(botCandidates);
      const delay = tools.getRandomDelay(10_000, 150_000);

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
   * 获取botId对应的client
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
        const raw = await redisService.fetch('crystelfBots', clientId);
        if (!Array.isArray(raw)) continue;

        for (const bot of raw) {
          const uin = Number(bot.uin);
          if (!isNaN(uin) && uin === botId) {
            return path.basename(clientId, '.json');
          }
        }
      } catch (err) {
        logger.error(`读取${clientId}出错..`);
      }
    }
    return undefined;
  }

  /**
   * 获取groupId对应的botId
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
        const raw = await redisService.fetch('crystelfBots', clientId);
        if (!Array.isArray(raw)) continue;

        for (const bot of raw) {
          const uin = Number(bot.uin);
          const groups = bot.groups;
          if (!uin || !Array.isArray(groups)) continue;

          if (groups.find((g) => Number(g.group_id) === groupId)) {
            return uin;
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
