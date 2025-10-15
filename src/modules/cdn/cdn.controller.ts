import { Controller, Get, Res, Logger, Inject, Req } from '@nestjs/common';
import { CdnService } from './cdn.service';
import { Response } from 'express';
import { ApiOperation } from '@nestjs/swagger';
import { ErrorUtil } from '../../common/utils/error.util';

@Controller()
export class CdnController {
  private readonly logger = new Logger(CdnController.name);

  constructor(@Inject(CdnService) private readonly fileService: CdnService) {}

  private async deliverFile(relativePath: string, res: Response) {
    try {
      this.logger.log(`有个小可爱正在请求 /cdn/${relativePath} ..`);

      const filePath = await this.fileService.getFile(relativePath);
      if (!filePath) {
        this.logger.warn(`${relativePath}：文件不存在..`);
        throw ErrorUtil.createNotFoundError('文件', relativePath);
      }

      res.sendFile(filePath, (err) => {
        if (err) {
          this.logger.error(`文件投递失败: ${err.message}`);
          throw ErrorUtil.createInternalError('文件投递失败', err);
        }
      });

      this.logger.log(`成功投递文件: ${filePath}`);
    } catch (error) {
      throw ErrorUtil.handleUnknownError(error, 'CDN处理文件请求失败', 'deliverFile');
    }
  }

  @Get('cdn/*')
  @ApiOperation({
    summary: '获取资源',
    description: '由晶灵资源分发服务器(CDN)提供支持',
  })
  public async getFile(@Res() res: Response, @Req() req: Request) {
    const relativePath = req.url.replace('/cdn/', ''); //params.path;
    return this.deliverFile(relativePath, res);
  }

  @Get('public/files/*')
  public async fromPublicFiles(@Res() res: Response, @Req() req: Request) {
    const relativePath = req.url.replace('/public/files/', '');
    this.logger.debug(
      `请求 /public/files/${relativePath} → 代理到 /cdn/${relativePath}`,
    );
    return this.deliverFile(relativePath, res);
  }

  @Get('public/cdn/*')
  public async fromPublicCdn(@Req() req: Request, @Res() res: Response) {
    const relativePath = req.url.replace('/public/cdn/', '');
    this.logger.debug(
      `请求 /public/cdn/${relativePath} → 代理到 /cdn/${relativePath}`,
    );
    return this.deliverFile(relativePath, res);
  }
}
