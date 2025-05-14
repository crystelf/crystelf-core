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
  private reportBots = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const token = req.body.token;
      if (tools.checkToken(token.toString())) {
        const sendMessage = {
          type: 'reportBots',
          data: {},
        };
        await wsClientManager.broadcast(sendMessage);
        await response.success(res, {});
      } else {
        await tools.tokenCheckFailed(res, token);
      }
    } catch (e) {
      await response.error(res);
    }
  };

  /**
   * 发送消息到群聊
   * @param req
   * @param res
   */
  private sendMessage = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const token = req.body.token;
      if (tools.checkToken(token.toString())) {
        const groupId: number = req.body.groupId;
        const message: string = req.body.message;
        const flag: boolean = await BotService.sendMessage(groupId, message);
        if (flag) {
          await response.success(res, {});
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
}

export default new BotController();
