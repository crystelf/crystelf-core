import {
  Controller,
  Post,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  UseGuards,
  Body,
} from '@nestjs/common';
import { WordsService } from './words.service';
import { TokenAuthGuard } from '../../core/tools/token-auth.guard';
import { ApiBody, ApiOperation, ApiProperty } from '@nestjs/swagger';

class WordsDto {
  @ApiProperty({ description: '文案类型', example: 'poke' })
  type: string;

  @ApiProperty({ description: '文案名称', example: 'poke' })
  id: string;

  @ApiProperty({
    description: '可选参数：替换文案中的人名',
    example: '坤坤',
    required: false,
  })
  name?: string;
}

class WordsReloadDto extends WordsDto {
  @ApiProperty({ description: '密钥', example: '1111' })
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
  @Post('getText')
  @ApiOperation({ summary: '获取随机文案' })
  @ApiBody({ type: WordsDto })
  async getText(@Body() dto: WordsDto) {
    try {
      const texts = await this.wordsService.loadWord(dto.type, dto.id);
      if (!texts || texts.length === 0) {
        throw new HttpException(
          `文案 ${dto.type}/${dto.id} 不存在或为空..`,
          HttpStatus.NOT_FOUND,
        );
      }

      const randomIndex = Math.floor(Math.random() * texts.length);
      let text = texts[randomIndex];
      if (dto.name) {
        text = text.replace(/真寻/g, dto.name);
      }

      return text;
    } catch (e) {
      this.logger.error(`getText 失败: ${e}`);
      throw new HttpException('服务器错误', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 重载文案
   */
  @Post('reloadText')
  @ApiOperation({ summary: '重载某条文案' })
  @UseGuards(TokenAuthGuard)
  @ApiBody({ type: WordsReloadDto })
  async reloadWord(@Body() dto: WordsReloadDto) {
    try {
      const success = await this.wordsService.reloadWord(dto.type, dto.id);
      if (success) {
        return '成功重载..';
      } else {
        throw new HttpException('重载失败..', HttpStatus.BAD_REQUEST);
      }
    } catch (e) {
      this.logger.error(`reloadWord 失败: ${e}`);
      throw new HttpException('服务器错误', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
