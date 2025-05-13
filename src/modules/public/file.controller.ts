import express from 'express';
import FileService from './file.service';
import logger from '../../utils/core/logger';
import response from '../../utils/core/response';
import paths from '../../utils/core/path';
import multer from 'multer';
import tools from '../../utils/modules/tools';

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
   * 处理文件上传请求
   * 客户端应以 `multipart/form-data` 格式上传文件，字段名为 `file`
   * @example 示例请求（使用 axios 和 form-data）
   * ```js
   * const form = new FormData();
   * const fileStream = fs.createReadStream(filePath);
   * form.append('file', fileStream);
   * const uploadUrl = `http://localhost:4000/upload?dir=example&expire=600`;
   * const response = await axios.post(uploadUrl, form, {
   *   headers: {
   *     ...form.getHeaders(),
   *   },
   *   maxContentLength: Infinity,
   *   maxBodyLength: Infinity,
   * });
   * ```
   *
   * @queryParam dir 上传到的相对目录，默认根目录
   * @queryParam expire 文件保留时间，默认 600 秒
   * @param req
   * @param res
   */
  private handleUploadFile = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const token = req.body.token;
      if (tools.checkToken(token.toString())) {
        if (!req.file) {
          await response.error(res, `未检测到上传文件`, 400);
          return;
        }

        const uploadDir = req.query.dir?.toString() || '';
        const deleteAfter = parseInt(req.query.expire as string) || 10 * 60;
        const { fullPath, relativePath } = await this.FileService.saveUploadedFile(
          req.file,
          uploadDir
        );
        await this.FileService.scheduleDelete(fullPath, deleteAfter * 1000);
        await response.success(res, {
          message: '文件上传成功..',
          filePath: fullPath,
          url: relativePath,
        });
      } else {
        await tools.tokenCheckFailed(res, token);
      }
    } catch (e) {
      await response.error(res, `文件上传失败..`, 500);
      logger.error(e);
    }
  };
}

export default new FileController();
