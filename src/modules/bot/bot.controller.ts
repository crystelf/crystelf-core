import express from 'express';
import response from '../../utils/core/response';
import BotService from './bot.service';
import tools from '../../utils/modules/tools';

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
}

export default new BotController();
