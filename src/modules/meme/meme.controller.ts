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
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiQuery,
  ApiConsumes,
  ApiHeader,
} from '@nestjs/swagger';
import { MemeService } from './meme.service';
import { Response } from 'express';
import * as fs from 'fs';
import { Throttle } from 'stream-throttle';
import { ToolsService } from '../../core/tools/tools.service';
import { RedisService } from '../../core/redis/redis.service';
import imageType from 'image-type';
import { FileInterceptor } from '@nestjs/platform-express';
import * as path from 'path';
import { OpenListService } from '../../core/openlist/openlist.service';
import { PathService } from '../../core/path/path.service';
import { TokenAuthGuard } from '../../core/tools/token-auth.guard';
import { AppConfigService } from '../../config/config.service';

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
    @Inject(OpenListService)
    private readonly openListService: OpenListService,
    @Inject(PathService)
    private readonly pathService: PathService,
    @Inject(AppConfigService)
    private readonly configService: AppConfigService,
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

  /**
   * 上传文件
   * @param file
   * @param character
   * @param status
   * @param res
   */
  @Post('upload')
  @ApiOperation({ summary: '上传表情包并同步' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiHeader({ name: 'x-token', description: '身份验证token', required: true })
  @UseGuards(TokenAuthGuard)
  @ApiBody({
    description: '上传表情包文件',
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        character: { type: 'string', description: '角色名称' },
        status: { type: 'string', description: '状态' },
      },
    },
  })
  public async uploadMeme(
    @UploadedFile() file: Express.Multer.File,
    @Body('character') character: string,
    @Body('status') status: string,
    @Res() res: Response,
  ) {
    if (!file) {
      throw new HttpException('未检测到上传文件', HttpStatus.BAD_REQUEST);
    }

    try {
      const fsp = fs.promises;
      const safeCharacter = character?.trim() || 'unknown';
      const safeStatus = status?.trim() || 'default';

      const memeBasePath = this.pathService.get('meme');
      const localDir = path.join(memeBasePath, safeCharacter, safeStatus);
      await fsp.mkdir(localDir, { recursive: true });

      const buffer = file.buffer || (await fsp.readFile(file.path));
      const imgType = await imageType(buffer);
      if (!imgType || !['jpg', 'png', 'gif', 'webp'].includes(imgType.ext)) {
        throw new HttpException(
          '不支持的图片格式',
          HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        );
      }
      const remoteMemePath = this.configService.get('OPENLIST_API_MEME_PATH');
      const remoteDir = `${remoteMemePath}/${safeCharacter}/${safeStatus}/`;
      let fileList: string[] = [];

      try {
        const listResult = await this.openListService.listFiles(remoteDir);
        if (
          listResult?.code === 200 &&
          Array.isArray(listResult.data?.content)
        ) {
          fileList = listResult.data.content.map((f) => f.name);
        } else {
          this.logger.warn(`目录为空或返回结构异常：${remoteDir}`);
        }
      } catch (err) {
        this.logger.warn(`获取远程目录失败(${remoteDir})，将自动创建`);
      }

      const usedNumbers = fileList
        .map((name) => {
          const match = name.match(/^(\d+)\./);
          return match ? parseInt(match[1], 10) : null;
        })
        .filter((n) => n !== null) as number[];

      const nextNumber =
        usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1;
      const remoteFilename = `${nextNumber}.${imgType.ext}`;
      const remoteFilePath = `${remoteDir}${remoteFilename}`;
      const localFilePath = path.join(localDir, remoteFilename);
      await fsp.writeFile(localFilePath, buffer);
      const fileStream = fs.createReadStream(localFilePath);
      await this.openListService.uploadFile(
        localFilePath,
        fileStream,
        remoteFilePath,
      );
      this.logger.log(`表情包上传成功: ${remoteFilePath}`);
      return '表情上传成功!';
    } catch (error) {
      this.logger.error('表情包上传失败:', error);
      throw new HttpException(
        `上传失败: ${error.message || error}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
