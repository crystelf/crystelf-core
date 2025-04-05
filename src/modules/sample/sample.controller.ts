import express from 'express';
import sampleService from './sample.service';
import response from '../../utils/core/response';

class SampleController {
  private readonly router: express.Router;

  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  public getRouter(): express.Router {
    return this.router;
  }

  private initializeRoutes(): void {
    this.router.get('/hello', this.getHello);
    this.router.post('/greet', this.postGreet);
  }

  private getHello = (req: express.Request, res: express.Response): void => {
    try {
      const result = sampleService.getHello();
      response.success(res, result);
    } catch (error) {
      response.error(res, '请求失败了..', 500, error);
    }
  };

  private postGreet = (req: express.Request, res: express.Response): void => {
    try {
      const { name } = req.body;
      if (!name) {
        return response.error(res, '姓名不能为空!', 400);
      }
      const result = sampleService.generateGreeting(name);
      response.success(res, result);
    } catch (error) {
      response.error(res, '请求失败了..', 500, error);
    }
  };
}

export default new SampleController();
