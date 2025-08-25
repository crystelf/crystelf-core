import {
  Controller,
  Get,
  Param,
  Res,
  Logger,
  HttpException,
  HttpStatus,
  Inject,
  Req,
} from '@nestjs/common';
import { CdnService } from './cdn.service';
import { Response } from 'express';
import { ApiOperation } from '@nestjs/swagger';

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
        throw new HttpException('文件不存在啦！', HttpStatus.NOT_FOUND);
      }

      res.sendFile(filePath, (err) => {
        if (err) {
          this.logger.error(`文件投递失败: ${err.message}`);
          throw new HttpException(
            'Crystelf-CDN处理文件请求时出错..',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      });

      this.logger.log(`成功投递文件: ${filePath}`);
    } catch (error) {
      this.logger.error('晶灵数据请求处理失败:', error);
      throw new HttpException(
        'Crystelf-CDN处理文件请求时出错..',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('cdn/*')
  @ApiOperation({
    summary: '获取资源',
    description: '由晶灵资源分发服务器(CDN)提供支持',
  })
  async getFile(@Res() res: Response, @Req() req: Request) {
    const relativePath = req.url.replace('/api/cdn/', ''); //params.path;
    return this.deliverFile(relativePath, res);
  }

  @Get('public/files/*')
  async fromPublicFiles(@Res() res: Response, @Req() req: Request) {
    const relativePath = req.url.replace('/api/public/files/', '');
    this.logger.debug(
      `请求 /public/files/${relativePath} → 代理到 /cdn/${relativePath}`,
    );
    return this.deliverFile(relativePath, res);
  }

  @Get('public/cdn/*')
  async fromPublicCdn(@Req() req: Request, @Res() res: Response) {
    const relativePath = req.url.replace('/api/public/cdn/', '');
    this.logger.debug(
      `请求 /public/cdn/${relativePath} → 代理到 /cdn/${relativePath}`,
    );
    return this.deliverFile(relativePath, res);
  }
}
