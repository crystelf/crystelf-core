import express from 'express';
import response from '../../utils/core/response';
import BotService from './bot.service';
import tools from '../../utils/modules/tools';
import logger from '../../utils/core/logger';
import wsClientManager from '../../services/ws/wsClientManager';

class BotController {
  private readonly router: express.Router;

  constructor() {
    this.router = express.Router();
    this.init();
  }

  public getRouter(): express.Router {
    return this.router;
  }

  private init(): void {
    this.router.post(`/getBotId`, this.postBotsId);
    this.router.post('/getGroupInfo', this.postGroupInfo);
    this.router.post('/sendMessage', this.sendMessage);
    this.router.post('/reportBots', this.reportBots);
    this.router.post('/broadcast', this.smartBroadcast);
  }

  /**
   * 获取当前连接到核心的全部botId数组
   * @param req
   * @param res
   */
  private postBotsId = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const token = req.body.token;
      if (tools.checkToken(token.toString())) {
        const result = await BotService.getBotId();
        await response.success(res, result);
      } else {
        await tools.tokenCheckFailed(res, token);
      }
    } catch (err) {
      await response.error(res, `请求失败..`, 500, err);
    }
  };

  /**
   * 获取群聊信息
   * @example req示例
   * ```json
   * {
   *  token: ‘114514’,
   *  groupId: 114514
   * }
   * ```
   * @param req
   * @param res
   */
  private postGroupInfo = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const token = req.body.token;
      if (tools.checkToken(token.toString())) {
        const groupId: number = req.body.groupId;
        let returnData = await BotService.getGroupInfo({ groupId: groupId });
        if (returnData) {
          await response.success(res, returnData);
          logger.debug(returnData);
        } else {
          await response.error(res);
        }
      } else {
        await tools.tokenCheckFailed(res, token);
      }
    } catch (e) {
      await response.error(res);
    }
  };

  /**
   * 广播要求同步群聊信息和bot连接情况
   * @param req
   * @param res
   */
  // TODO 测试接口可用性
  private reportBots = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const token = req.body.token;
      if (tools.checkToken(token.toString())) {
        const sendMessage = {
          type: 'reportBots',
          data: {},
        };
        logger.info(`正在请求同步bot数据..`);
        await response.success(res, {});
        await wsClientManager.broadcast(sendMessage);
      } else {
        await tools.tokenCheckFailed(res, token);
      }
    } catch (e) {
      await response.error(res);
    }
  };

  /**
   * 发送消息到群聊,自动获取client
   * @param req
   * @param res
   */
  // TODO 测试接口可用性
  private sendMessage = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const token = req.body.token;
      if (tools.checkToken(token.toString())) {
        const groupId: number = Number(req.body.groupId);
        const message: string = req.body.message.toString();
        const flag: boolean = await BotService.sendMessage(groupId, message);
        if (flag) {
          await response.success(res, { message: '消息发送成功..' });
        } else {
          await response.error(res);
        }
      } else {
        await tools.tokenCheckFailed(res, token);
      }
    } catch (e) {
      await response.error(res);
    }
  };

  /**
   * 智能广播消息到全部群聊
   * @param req
   * @param res
   */
  // TODO 测试接口可用性
  private smartBroadcast = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const token = req.body.token;
      const message = req.body.message;
      if (!message || typeof message !== 'string') {
        return await response.error(res, '缺少 message 字段', 400);
      }
      if (tools.checkToken(token.toString())) {
        logger.info(`广播任务已开始，正在后台执行..`);
        await response.success(res, '广播任务已开始，正在后台执行..');
        await BotService.broadcastToAllGroups(message);
      } else {
        await tools.tokenCheckFailed(res, token);
      }
    } catch (e) {
      await response.error(res);
    }
  };
}

export default new BotController();
