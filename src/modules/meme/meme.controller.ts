import {
  Controller,
  Post,
  Body,
  Res,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiProperty } from '@nestjs/swagger';
import { MemeService } from './meme.service';
import { Response } from 'express';
import * as fs from 'fs';

class MemeRequestDto {
  @ApiProperty({ description: '角色名称', example: 'zhenxun', required: false })
  character?: string;

  @ApiProperty({ description: '状态', example: 'happy', required: false })
  status?: string;
}

@Controller('meme')
@ApiTags('Meme')
export class MemeController {
  private readonly logger = new Logger(MemeController.name);

  constructor(@Inject(MemeService) private readonly memeService: MemeService) {}

  @Post('getRandom')
  @ApiOperation({ summary: '获取随机表情包' })
  @ApiBody({ type: MemeRequestDto })
  async getRandomMeme(@Body() dto: MemeRequestDto, @Res() res: Response) {
    try {
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

      const stream = fs.createReadStream(memePath);
      stream.on('error', () => {
        throw new HttpException(
          '读取表情包失败',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      });

      const ext = memePath.split('.').pop()?.toLowerCase();
      let contentType = 'image/jpeg';
      if (ext === 'png') contentType = 'image/png';
      if (ext === 'gif') contentType = 'image/gif';
      if (ext === 'webp') contentType = 'image/webp';

      res.setHeader('Content-Type', contentType);
      stream.pipe(res);
    } catch (e) {
      this.logger.error(`获取表情包失败: ${e.message}`);
      throw new HttpException('服务器错误', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
