import express from 'express';
import sampleService from './sample.service';

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
      this.sendSuccess(res, result);
    } catch (error) {
      this.sendError(res, error);
    }
  };

  private postGreet = (req: express.Request, res: express.Response): void => {
    try {
      const { name } = req.body;
      const result = sampleService.generateGreeting(name);
      this.sendSuccess(res, result);
    } catch (error) {
      this.sendError(res, error);
    }
  };

  private sendSuccess(res: express.Response, data: any, statusCode = 200): void {
    res.status(statusCode).json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  private sendError(res: express.Response, error: any, statusCode = 500): void {
    res.status(statusCode).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

export default new SampleController();
