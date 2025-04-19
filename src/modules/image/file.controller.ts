import express from 'express';
import FileService from './file.service';
import logger from '../../utils/core/logger';
import response from '../../utils/core/response';

class FileController {
  private readonly router: express.Router;
  private readonly imageService: FileService;

  constructor() {
    this.router = express.Router();
    this.imageService = new FileService();
    this.initializeRoutes();
  }

  public getRouter(): express.Router {
    return this.router;
  }

  private initializeRoutes(): void {
    this.router.get('*', this.handleGetFile);
  }

  private handleGetFile = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const fullPath = req.params[0];
      logger.debug(`有个小可爱正在请求${fullPath}噢..`);
      const filePath = await this.imageService.getFile(fullPath);
      if (!filePath) {
        logger.warn(`${fullPath}：文件不存在..`);
        await response.error(res, '文件不存在啦！', 404);
        return;
      }

      res.sendFile(filePath);
      logger.info(`成功投递文件: ${filePath}`);
    } catch (error) {
      await response.error(res, '晶灵服务处理文件请求时出错..', 500);
      logger.error('晶灵数据请求处理失败:', error);
    }
  };
}

export default new FileController();
