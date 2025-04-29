import express from 'express';
import response from '../../utils/core/response';
import BotService from './bot.service';
import Config from '../../utils/core/config';

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

  private postBotsId = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const token = req.body.token;
      if (token.toString() === Config.get('TOKEN').toString()) {
        const result = await BotService.getBotId();
        await response.success(res, result);
      } else {
        await response.error(
          res,
          'token验证失败..',
          404,
          `有个小可爱使用了错误的token:${JSON.stringify(token)}`
        );
      }
    } catch (err) {
      await response.error(res, `请求失败..`, 500, err);
    }
  };
}

export default new BotController();
