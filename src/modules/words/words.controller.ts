import {
  Controller,
  Get,
  Param,
  Post,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { WordsService } from './words.service';
import { TokenAuthGuard } from '../../core/tools/token-auth.guard';
import { ApiBody, ApiOperation, ApiProperty } from '@nestjs/swagger';

class WordsDto {
  @ApiProperty({
    description: '文案id',
    example: 'poke',
  })
  id: string;
  @ApiProperty({
    description: '密钥',
    example: '1111',
  })
  token: string;
}

@Controller('words')
export class WordsController {
  private readonly logger = new Logger(WordsController.name);

  constructor(
    @Inject(WordsService) private readonly wordsService: WordsService,
  ) {}

  /**
   * 获取随机文案
   */
  @Get('getText/:id')
  @ApiOperation({
    summary: '获取随机文案',
  })
  async getText(@Param('id') id: string) {
    try {
      const texts = await this.wordsService.loadWordById(id);
      if (!texts || texts.length === 0) {
        throw new HttpException(
          `文案 ${id} 不存在或为空..`,
          HttpStatus.NOT_FOUND,
        );
      }
      const randomIndex = Math.floor(Math.random() * texts.length);
      return { success: true, data: texts[randomIndex] };
    } catch (e) {
      this.logger.error(`getText 失败: ${e?.message}`);
      throw new HttpException('服务器错误', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 重载文案
   */
  @Post('reloadText/:id')
  @ApiOperation({
    summary: '重载某条文案',
  })
  @UseGuards(TokenAuthGuard)
  @ApiBody({ type: WordsDto })
  async reloadWord(@Param('id') id: string, @Param('token') token: string) {
    try {
      const success = await this.wordsService.reloadWord(id);
      if (success) {
        return '成功重载..';
      } else {
        throw new HttpException('重载失败..', HttpStatus.BAD_REQUEST);
      }
    } catch (e) {
      this.logger.error(`reloadWord 失败: ${e?.message}`);
      throw new HttpException('服务器错误', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
