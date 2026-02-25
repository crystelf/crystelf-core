import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
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
import imageType from 'image-type';
import { FileInterceptor } from '@nestjs/platform-express';
import * as path from 'path';
import { OpenListService } from '../../core/openlist/openlist.service';
import { PathService } from '../../core/path/path.service';
import { TokenAuthGuard } from '../../core/tools/token-auth.guard';
import { AppConfigService } from '../../config/config.service';
import { ErrorUtil } from '../../common/utils/error.util';

class MemeRequestDto {
  character?: string;
  status?: string;
  token?: string;
}

@Controller('meme')
@ApiTags('Meme')
export class MemeController {
  private readonly logger = new Logger(MemeController.name);
  private static readonly activeConnections = new Map<string, number>();
  private static readonly maxConnectionsPerIp = 3; // 每IP最大并发连接数

  constructor(
    @Inject(MemeService)
    private readonly memeService: MemeService,
    @Inject(OpenListService)
    private readonly openListService: OpenListService,
    @Inject(PathService)
    private readonly pathService: PathService,
    @Inject(AppConfigService)
    private readonly configService: AppConfigService,
  ) {}

  @Post('get')
  @ApiOperation({ summary: '获取随机表情包' })
  @ApiHeader({ name: 'x-token', description: '身份验证token', required: false })
  @ApiBody({
    description: '获取表情包参数',
    schema: {
      type: 'object',
      properties: {
        character: { type: 'string', description: '角色名称' },
        status: { type: 'string', description: '状态' },
      },
    },
  })
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
   * 增加IP活跃连接数
   * @param ip IP地址
   * @returns 是否成功增加
   */
  private incrementActiveConnections(ip: string): boolean {
    const current = MemeController.activeConnections.get(ip) || 0;
    if (current >= MemeController.maxConnectionsPerIp) {
      return false;
    }
    MemeController.activeConnections.set(ip, current + 1);
    return true;
  }

  /**
   * 减少IP活跃连接数
   * @param ip IP地址
   */
  private decrementActiveConnections(ip: string): void {
    const current = MemeController.activeConnections.get(ip) || 0;
    if (current <= 1) {
      MemeController.activeConnections.delete(ip);
    } else {
      MemeController.activeConnections.set(ip, current - 1);
    }
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
      if (!this.incrementActiveConnections(ip)) {
        this.logger.warn(`[${method}] ${ip} 并发连接数超限`);
        res.status(429).json({
          success: false,
          message: '请求过于频繁,请稍后再试',
        });
        return;
      }

      const memePath = await this.memeService.getRandomMemePath(
        dto.character,
        dto.status,
      );

      if (!memePath) {
        this.decrementActiveConnections(ip);
        throw ErrorUtil.createNotFoundError('表情包');
      }

      const ext = memePath.split('.').pop()?.toLowerCase();
      let contentType = 'image/jpeg';
      if (ext === 'png') contentType = 'image/png';
      if (ext === 'gif') contentType = 'image/gif';
      if (ext === 'webp') contentType = 'image/webp';

      res.setHeader('Content-Type', contentType);
      const stream = fs.createReadStream(memePath);

      stream.on('error', (error) => {
        throw ErrorUtil.createInternalError('读取表情包失败', error);
      });

      const fd = await fs.promises.open(memePath, 'r');
      const { buffer } = await fd.read(Buffer.alloc(4100), 0, 4100, 0);
      await fd.close();

      const cleanup = () => {
        this.decrementActiveConnections(ip);
      };

      stream.on('end', cleanup);
      stream.on('error', cleanup);

      this.logger.log(`[${method}] ${ip} => ${memePath}`);

      stream.pipe(res);
    } catch (e) {
      this.decrementActiveConnections(ip);
      throw ErrorUtil.handleUnknownError(
        e,
        '获取表情包失败',
        'handleMemeRequest',
      );
    }
  }

  /**
   * 上传文件
   * @param file
   * @param character
   * @param status
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
  ) {
    if (!file) {
      throw ErrorUtil.createValidationError('未检测到上传文件');
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
        throw ErrorUtil.createBusinessError(
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
          this.logger.warn(`目录为空或返回结构异常:${remoteDir}`);
        }
      } catch (err) {
        this.logger.warn(`获取远程目录失败(${remoteDir}),将自动创建`);
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
      return '表情上传成功..';
    } catch (error) {
      throw ErrorUtil.handleUnknownError(error, '上传失败', 'uploadMeme');
    }
  }
}
