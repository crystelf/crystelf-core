import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Inject,
  UseGuards,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiProperty } from '@nestjs/swagger';
import { SystemWebService } from './systemWeb.service';
import { ToolsService } from '../../core/tools/tools.service';
import { TokenAuthGuard } from '../../core/tools/token-auth.guard';

class WebServerDto {
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
  @UseGuards(TokenAuthGuard)
  @ApiBody({ type: WebServerDto })
  async systemRestart(@Param('token') token: string): Promise<string> {
    this.systemService.systemRestart();
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
  @UseGuards(TokenAuthGuard)
  @ApiBody({ type: WebServerDto })
  async getRestartTime(@Param('token') token: string): Promise<string> {
    return await this.systemService.getRestartTime();
  }
}
