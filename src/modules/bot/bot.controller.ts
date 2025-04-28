import express from 'express';
import response from '../../utils/core/response';
import BotService from './bot.service';

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
      const result = await BotService.getBotId();
      await response.success(res, result);
    } catch (err) {
      await response.error(res, `请求失败..`, 500, err);
    }
  };
}

export default new BotController();
