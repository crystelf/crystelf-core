import express from 'express';
import response from '../../utils/core/response';
import BotService from './bot.service';
import tools from '../../utils/modules/tools';
import logger from '../../utils/core/logger';

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
    this.router.post('/getBotInfo', this.postGroupInfo);
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
   * token: ‘114514’,
   * botId: ‘114514’,
   * groupId: ‘114514’
   * }
   * ```
   * @param req
   * @param res
   */
  private postGroupInfo = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const token = req.body.token;
      if (tools.checkToken(token.toString())) {
        const botId = req.body.botId;
        const groupId = req.body.groupId;
        let returnData = await BotService.getGroupInfo({ botId: botId, groupId: groupId });
        if (returnData) {
          await response.success(res, returnData);
          logger.debug(returnData);
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
