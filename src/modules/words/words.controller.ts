import {
  Controller,
  Post,
  HttpStatus,
  Logger,
  Inject,
  UseGuards,
  Body,
} from '@nestjs/common';
import { WordsService } from './words.service';
import { TokenAuthGuard } from '../../core/tools/token-auth.guard';
import { ApiBody, ApiOperation, ApiProperty, ApiHeader } from '@nestjs/swagger';
import { ErrorUtil } from '../../common/utils/error.util';

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

class WordsReloadDto extends WordsDto {}

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
  @ApiBody({
    description: '获取文案参数',
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: '文案类型', example: 'poke' },
        id: { type: 'string', description: '文案名称', example: 'poke' },
        name: {
          type: 'string',
          description: '可选参数：替换文案中的人名',
          example: '坤坤',
        },
      },
      required: ['type', 'id'],
    },
  })
  public async getText(@Body() dto: WordsDto) {
    try {
      const texts = await this.wordsService.loadWord(dto.type, dto.id);
      if (!texts || texts.length === 0) {
        throw ErrorUtil.createNotFoundError('文案', `${dto.type}/${dto.id}`);
      }

      const randomIndex = Math.floor(Math.random() * texts.length);
      let text = texts[randomIndex];
      if (dto.name) {
        text = text.replace(/真寻/g, dto.name);
      }

      return text;
    } catch (e) {
      this.logger.error(`getText 失败: ${e}`);
      throw ErrorUtil.handleUnknownError(e, '获取文案失败');
    }
  }

  /**
   * 重载文案
   */
  @Post('reloadText')
  @ApiOperation({ summary: '重载某条文案' })
  @UseGuards(TokenAuthGuard)
  @ApiHeader({ name: 'x-token', description: '身份验证token', required: true })
  @ApiBody({
    description: '重载文案参数',
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: '文案类型', example: 'poke' },
        id: { type: 'string', description: '文案名称', example: 'poke' },
        name: {
          type: 'string',
          description: '可选参数：替换文案中的人名',
          example: '坤坤',
        },
      },
      required: ['type', 'id'],
    },
  })
  public async reloadWord(@Body() dto: WordsReloadDto) {
    try {
      const success = await this.wordsService.reloadWord(dto.type, dto.id);
      if (success) {
        return '成功重载..';
      } else {
        throw ErrorUtil.createBusinessError('重载失败', HttpStatus.BAD_REQUEST);
      }
    } catch (e) {
      this.logger.error(`reloadWord 失败: ${e}`);
      throw ErrorUtil.handleUnknownError(e, '重载文案失败');
    }
  }

  @Post('list')
  @ApiOperation({ summary: '获取指定类型下的所有文案名称' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', example: 'poke' },
      },
      required: ['type'],
    },
  })
  public async listWords(@Body('type') type: string) {
    try {
      const names = await this.wordsService.listWordNames(type);
      if (names.length === 0) {
        throw ErrorUtil.createNotFoundError('文案类型', type);
      }
      return names;
    } catch (e) {
      this.logger.error(`listWords 失败: ${e}`);
      throw ErrorUtil.handleUnknownError(e, '获取文案列表失败');
    }
  }
}
