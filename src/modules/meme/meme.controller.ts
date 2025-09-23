import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';
import { MemeService } from './meme.service';
import { Response } from 'express';
import * as fs from 'fs';
import { Throttle } from 'stream-throttle';
import { ToolsService } from '../../core/tools/tools.service';
import { RedisService } from '../../core/redis/redis.service';
import imageType from 'image-type';

class MemeRequestDto {
  character?: string;
  status?: string;
  token?: string;
}

@Controller('meme')
@ApiTags('Meme')
export class MemeController {
  private readonly logger = new Logger(MemeController.name);

  constructor(
    @Inject(MemeService)
    private readonly memeService: MemeService,
    @Inject(ToolsService)
    private readonly toolsService: ToolsService,
    @Inject(RedisService)
    private readonly redisService: RedisService,
  ) {}

  @Post('get')
  @ApiOperation({ summary: '获取随机表情包' })
  @ApiQuery({ name: 'character', required: false, description: '角色名称' })
  @ApiQuery({ name: 'status', required: false, description: '状态' })
  @ApiQuery({ name: 'token', required: false, description: '可选访问令牌' })
  @ApiBody({ type: MemeRequestDto })
  public async getRandomMemePost(
    @Body() dto: MemeRequestDto,
    @Res() res: Response,
    @Ip() ip: string,
  ) {
    return this.handleMemeRequest(dto, res, ip, 'POST');
  }

  @Get()
  @ApiOperation({ summary: '获取随机表情包' })
  @ApiQuery({ name: 'character', required: false, description: '角色名称' })
  @ApiQuery({ name: 'status', required: false, description: '状态' })
  @ApiQuery({ name: 'token', required: false, description: '可选访问令牌' })
  public async getRandomMemeGet(
    @Query() query: MemeRequestDto,
    @Res() res: Response,
    @Ip() ip: string,
  ) {
    return this.handleMemeRequest(query, res, ip, 'GET');
  }

  /**
   * 处理请求
   * @param dto
   * @param res
   * @param ip
   * @param method
   * @private
   */
  private async handleMemeRequest(
    dto: MemeRequestDto,
    res: Response,
    ip: string,
    method: string,
  ) {
    try {
      const realToken = dto.token;
      const hasValidToken =
        realToken && this.toolsService.checkToken(realToken);

      const memePath = await this.memeService.getRandomMemePath(
        dto.character,
        dto.status,
      );

      if (!memePath) {
        throw new HttpException(
          '没有找到符合条件的表情包',
          HttpStatus.NOT_FOUND,
        );
      }

      const ext = memePath.split('.').pop()?.toLowerCase();
      let contentType = 'image/jpeg';
      if (ext === 'png') contentType = 'image/png';
      if (ext === 'gif') contentType = 'image/gif';
      if (ext === 'webp') contentType = 'image/webp';

      res.setHeader('Content-Type', contentType);
      const stream = fs.createReadStream(memePath);

      stream.on('error', () => {
        throw new HttpException(
          '读取表情包失败',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      });

      const fd = await fs.promises.open(memePath, 'r');
      const { buffer } = await fd.read(Buffer.alloc(4100), 0, 4100, 0);
      await fd.close();
      const type = await imageType(buffer);
      const isAnimatedImage =
        type?.mime === 'image/gif' ||
        type?.mime === 'image/webp' ||
        type?.mime === 'image/apng';

      //this.logger.debug(type?.mime);
      const singleRate = 200 * 1024; // 100 KB/s * 3
      const maxThreads = 2;
      const maxRate = singleRate * maxThreads;

      if (hasValidToken) {
        this.logger.log(`[${method}] 有token的入不限速 => ${memePath}`);
        stream.pipe(res);
      } else {
        stream.on('data', async (chunk) => {
          const bytes = chunk.length;
          const total = await this.redisService.incrementIpTraffic(
            ip,
            bytes,
            1,
          );
          if (total > maxRate && !isAnimatedImage) {
            this.logger.warn(`[${method}] ${ip} 超过速率限制,断开连接..`);
            stream.destroy();
            res.end();
          }
        });

        const throttle = new Throttle({ rate: singleRate });
        this.logger.log(
          `[${method}] 白嫖入限速! (${ip}) => ${memePath}
          `,
        );
        stream.pipe(throttle).pipe(res);
      }
    } catch (e) {
      this.logger.error(`获取表情包失败:${e.message}`);
      throw new HttpException('服务器错误', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
