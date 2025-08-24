import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiProperty } from '@nestjs/swagger';
import { SystemWebService } from './systemWeb.service';
import { ToolsService } from '../../core/tools/tools.service';

class TokenDto {
  @ApiProperty({
    description: '密钥',
    example: '1111',
  })
  token: string;
}

@ApiTags('System')
@Controller('system')
export class SystemWebController {
  constructor(
    @Inject(SystemWebService)
    private readonly systemService: SystemWebService,
    @Inject(ToolsService)
    private readonly toolService: ToolsService,
  ) {}

  /**
   * 重启系统
   */
  @Post('restart')
  @ApiOperation({
    summary: '系统重启',
    description: '核心执行重启',
  })
  @ApiBody({ type: TokenDto })
  async systemRestart(@Body() body: TokenDto): Promise<string> {
    if (!this.toolService.checkToken(body.token)) {
      throw new UnauthorizedException('Token 无效');
    }
    await this.systemService.systemRestart();
    return '核心正在重启..';
  }

  /**
   * 获取系统重启耗时
   */
  @Post('getRestartTime')
  @ApiOperation({
    summary: '获取重启所需时间',
    description: '返回上次核心重启的耗时',
  })
  @ApiBody({ type: TokenDto })
  async getRestartTime(@Body() body: TokenDto): Promise<string> {
    if (!this.toolService.checkToken(body.token)) {
      throw new UnauthorizedException('Token 无效');
    }
    return await this.systemService.getRestartTime();
  }
}
