import {
  Controller,
  Post,
  Body,
  Res,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiProperty } from '@nestjs/swagger';
import { MemeService } from './meme.service';
import { Response } from 'express';
import * as fs from 'fs';
import { Throttle } from 'stream-throttle';
import { ToolsService } from '../../core/tools/tools.service';
import { RedisService } from '../../core/redis/redis.service';

class MemeRequestDto {
  @ApiProperty({ description: '角色名称', example: 'zhenxun', required: false })
  character?: string;

  @ApiProperty({ description: '状态', example: 'happy', required: false })
  status?: string;

  @ApiProperty({
    description: '可选访问令牌',
    example: 'token',
    required: false,
  })
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

  @Post('getRandom')
  @ApiOperation({ summary: '获取随机表情包' })
  @ApiBody({ type: MemeRequestDto })
  public async getRandomMeme(
    @Body() dto: MemeRequestDto,
    @Res() res: Response,
    @Ip() ip: string,
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

      if (hasValidToken) {
        this.logger.log(`有token入不限速: ${memePath}`);
        stream.pipe(res);
      } else {
        stream.on('data', async (chunk) => {
          const bytes = chunk.length;
          const total = await this.redisService.incrementIpTraffic(
            ip,
            bytes,
            1,
          );
          if (total > 100 * 1024) {
            this.logger.warn(`IP ${ip} 超过速率限制,断开连接..`);
            stream.destroy();
            res.end();
          }
        });

        const throttle = new Throttle({ rate: 100 * 1024 });
        this.logger.log(`白嫖的入限速!(${ip}) => ${memePath}`);
        stream.pipe(throttle).pipe(res);
      }
    } catch (e) {
      this.logger.error(`获取表情包失败:${e.message}`);
      throw new HttpException('服务器错误', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
