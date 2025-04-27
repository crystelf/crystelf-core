import express from 'express';
import TestService from './test.service';
import response from '../../utils/core/response';
import logger from '../../utils/core/logger';

class TestController {
  private readonly router: express.Router;

  constructor() {
    this.router = express.Router();
    this.initRouter();
  }

  public getRouter(): express.Router {
    return this.router;
  }

  public initRouter(): void {
    this.router.get('/test', this.test);
  }
  private test = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const result = await TestService.test();
      await response.success(res, result);
    } catch (err) {
      logger.error(err);
    }
  };
}

export default new TestController();
