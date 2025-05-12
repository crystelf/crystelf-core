import express from 'express';
import FileService from './file.service';
import logger from '../../utils/core/logger';
import response from '../../utils/core/response';
import paths from '../../utils/core/path';
import multer from 'multer';

const uploadDir = paths.get('uploads');
const upload = multer({
  dest: uploadDir,
});

class FileController {
  private readonly router: express.Router;
  private readonly FileService: FileService;

  constructor() {
    this.router = express.Router();
    this.FileService = new FileService();
    this.initializeRoutes();
  }

  public getRouter(): express.Router {
    return this.router;
  }

  private initializeRoutes(): void {
    this.router.get('*', this.handleGetFile);
    this.router.post('/upload', upload.single('file'), this.handleUploadFile);
  }

  /**
   * get文件
   * @param req
   * @param res
   */
  private handleGetFile = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const fullPath = req.params[0];
      logger.debug(`有个小可爱正在请求${fullPath}噢..`);
      const filePath = await this.FileService.getFile(fullPath);
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

  /**
   * 文件上传接口
   * @example 示例请求
   * ```js
   * const form = new FormData();
   * const fileStream = fs.createReadStream(filePath);
   * form.append('file', fileStream);
   * const uploadUrl = `http://localhost:4000/upload?dir=${uploadDir}`;
   * const response = await axios.post(uploadUrl, form, {
   *       headers: {
   *         ...form.getHeaders(),
   *       },
   *       maxContentLength: Infinity,
   *       maxBodyLength: Infinity,
   *     });
   * ```
   * @param req
   * @param res
   */
  private handleUploadFile = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      if (!req.file) {
        await response.error(res, `未检测到上传文件`, 400);
        return;
      }

      const uploadDir = req.query.dir?.toString() || '';
      const { fullPath, relativePath } = await this.FileService.saveUploadedFile(
        req.file,
        uploadDir
      );
      await response.success(res, {
        message: '文件上传成功..',
        filePath: fullPath,
        url: relativePath,
      });
    } catch (e) {
      await response.error(res, `文件上传失败..`, 500);
      logger.error(e);
    }
  };
}

export default new FileController();
