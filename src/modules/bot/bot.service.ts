import { Inject, Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { RedisService } from 'src/core/redis/redis.service';
import { WsClientManager } from 'src/core/ws/ws-client.manager';
import { ToolsService } from '../../core/tools/tools.service';
import { PathService } from '../../core/path/path.service';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    @Inject(RedisService)
    private readonly redisService: RedisService,
    @Inject(WsClientManager)
    private readonly wsClientManager: WsClientManager,
    @Inject(ToolsService)
    private readonly tools: ToolsService,
    @Inject(PathService)
    private readonly paths: PathService,
  ) {}

  /**
   * 获取botId数组
   */
  async getBotId(): Promise<{ uin: number; nickName: string }[]> {
    this.logger.debug('正在请求获取在线的bot..');
    const userPath = this.paths.get('userData');
    const botsPath = path.join(userPath, '/crystelfBots');
    const dirData = await fs.readdir(botsPath);
    const uins: { uin: number; nickName: string }[] = [];

    for (const fileName of dirData) {
      if (!fileName.endsWith('.json')) continue;

      try {
        const raw = await this.redisService.fetch('crystelfBots', fileName);
        if (!raw || !Array.isArray(raw)) continue;

        for (const bot of raw) {
          const uin = Number(bot.uin);
          const nickName = bot.nickName || '';
          if (!isNaN(uin)) {
            uins.push({ uin, nickName });
          }
        }
      } catch (err) {
        this.logger.error(`读取或解析 ${fileName} 出错: ${err}`);
      }
    }
    return uins;
  }

  /**
   * 获取群聊信息
   * @param data
   */
  async getGroupInfo(data: {
    botId?: number;
    groupId: number;
    clientId?: string;
  }): Promise<any> {
    this.logger.debug(`正在尝试获取${data.groupId}的信息..)`);
    const sendBot: number | undefined =
      data.botId ?? (await this.getGroupBot(data.groupId));
    if (!sendBot) {
      this.logger.warn(`不存在能向群聊${data.groupId}发送消息的Bot!`);
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
      const returnData = await this.wsClientManager.sendAndWait(
        sendData.data.clientID,
        sendData,
      );
      return returnData ?? undefined;
    }
    return undefined;
  }

  /**
   * 发送消息到群聊
   * @param groupId 群号
   * @param message 消息
   */
  async sendMessage(groupId: number, message: string): Promise<boolean> {
    this.logger.log(`发送${message}到${groupId}..`);
    const sendBot = await this.getGroupBot(groupId);
    if (!sendBot) {
      this.logger.warn(`不存在能向群聊${groupId}发送消息的Bot!`);
      return false;
    }
    const client = await this.getBotClient(sendBot);
    if (!client) {
      this.logger.warn(`不存在${sendBot}对应的client!`);
      return false;
    }
    const sendData = {
      type: 'sendMessage',
      data: { botId: sendBot, groupId, clientId: client, message },
    };
    await this.wsClientManager.send(client, sendData);
    return true;
  }

  /**
   * 广播消息
   * @param message 要广播的消息
   */
  async broadcastToAllGroups(message: string): Promise<void> {
    const userPath = this.paths.get('userData');
    const botsPath = path.join(userPath, '/crystelfBots');
    const dirData = await fs.readdir(botsPath);
    const groupMap: Map<number, { botId: number; clientId: string }[]> =
      new Map();
    this.logger.log(`广播消息：${message}`);
    for (const fileName of dirData) {
      if (!fileName.endsWith('.json')) continue;

      const clientId = path.basename(fileName, '.json');
      const botList = await this.redisService.fetch('crystelfBots', fileName);
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
      this.logger.debug(
        `[群 ${groupId}] 候选Bot列表: ${JSON.stringify(botEntries)}`,
      );

      const clientGroups = new Map<string, number[]>();
      botEntries.forEach(({ botId, clientId }) => {
        if (!clientGroups.has(clientId)) clientGroups.set(clientId, []);
        clientGroups.get(clientId)!.push(botId);
      });

      const selectedClientId = this.tools.getRandomItem([
        ...clientGroups.keys(),
      ]);
      const botCandidates = clientGroups.get(selectedClientId)!;
      const selectedBotId = this.tools.getRandomItem(botCandidates);
      const delay = this.tools.getRandomDelay(10_000, 150_000);

      setTimeout(() => {
        const sendData = {
          type: 'sendMessage',
          data: {
            botId: selectedBotId,
            groupId,
            clientId: selectedClientId,
            message,
          },
        };
        this.logger.log(
          `[广播] 向群 ${groupId} 使用Bot ${selectedBotId}（客户端 ${selectedClientId}）发送消息${message}，延迟 ${
            delay / 1000
          } 秒`,
        );
        this.wsClientManager.send(selectedClientId, sendData).catch((e) => {
          this.logger.error(`发送到群${groupId}失败:`, e);
        });
      }, delay);
    }
  }

  /**
   * 获取botId对应的client
   * @param botId
   * @private
   */
  private async getBotClient(botId: number): Promise<string | undefined> {
    const userPath = this.paths.get('userData');
    const botsPath = path.join(userPath, '/crystelfBots');
    const dirData = await fs.readdir(botsPath);

    for (const clientId of dirData) {
      if (!clientId.endsWith('.json')) continue;

      try {
        const raw = await this.redisService.fetch('crystelfBots', clientId);
        if (!Array.isArray(raw)) continue;

        for (const bot of raw) {
          const uin = Number(bot.uin);
          if (!isNaN(uin) && uin === botId) {
            return path.basename(clientId, '.json');
          }
        }
      } catch (err) {
        this.logger.error(`读取${clientId}出错..`);
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
    const userPath = this.paths.get('userData');
    const botsPath = path.join(userPath, '/crystelfBots');
    const dirData = await fs.readdir(botsPath);

    for (const clientId of dirData) {
      if (!clientId.endsWith('.json')) continue;

      try {
        const raw = await this.redisService.fetch('crystelfBots', clientId);
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
        this.logger.error(`读取${clientId}出错..`);
      }
    }
    return undefined;
  }
}
