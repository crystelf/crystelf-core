import express from 'express';
import tools from '../../utils/modules/tools';
import response from '../../utils/core/response';
import SystemService from './system.service';

class SystemController {
  private readonly router: express.Router;

  constructor() {
    this.router = express.Router();
    this.init();
  }

  public getRouter(): express.Router {
    return this.router;
  }

  private init(): void {
    this.router.post('/restart', this.systemRestart);
    this.router.post('/getRestartTime', this.getRestartTime);
  }

  /**
   * 系统重启路由
   * @param req
   * @param res
   */
  private systemRestart = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const token = req.body.token;
      if (tools.checkToken(token.toString())) {
        await SystemService.systemRestart();
        await response.success(res, '核心正在重启..');
      } else {
        await tools.tokenCheckFailed(res, token);
      }
    } catch (e) {
      await response.error(res);
    }
  };

  /**
   * 获取重启所需时间
   * @param req
   * @param res
   */
  private getRestartTime = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const token = req.body.token;
      if (tools.checkToken(token.toString())) {
        const time = await SystemService.getRestartTime();
        await response.success(res, time);
      } else {
        await tools.tokenCheckFailed(res, token);
      }
    } catch (e) {
      await response.error(res);
    }
  };
}

export default new SystemController();
