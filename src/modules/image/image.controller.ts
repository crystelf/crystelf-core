import express from 'express';
import ImageService from './image.service';
import logger from '../../utils/core/logger';

class ImageController {
  private readonly router: express.Router;
  private readonly imageService: ImageService;

  constructor() {
    this.router = express.Router();
    this.imageService = new ImageService();
    this.initializeRoutes();
  }

  public getRouter(): express.Router {
    return this.router;
  }

  private initializeRoutes(): void {
    this.router.get('/:filename', this.handleGetImage);
  }

  private handleGetImage = (req: express.Request, res: express.Response): void => {
    try {
      const filename = req.params.filename;
      logger.debug(`有个小可爱正在请求${filename}噢..`);

      const filePath = this.imageService.getImage(filename);
      if (!filePath) {
        this.sendError(res, 404, '文件不存在啦！');
        return;
      }

      res.sendFile(filePath);
      logger.info(`成功投递文件: ${filePath}`);
    } catch (error) {
      this.sendError(res, 500, '晶灵服务处理图像请求时出错..');
      logger.error('晶灵图像请求处理失败:', error);
    }
  };

  private sendError(res: express.Response, statusCode: number, message: string): void {
    res.status(statusCode).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    });
  }
}

export default new ImageController();
