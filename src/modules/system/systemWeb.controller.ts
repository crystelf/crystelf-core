import { Controller, Post, Inject, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiHeader } from '@nestjs/swagger';
import { SystemWebService } from './systemWeb.service';
import { TokenAuthGuard } from '../../core/tools/token-auth.guard';

@ApiTags('System')
@Controller('system')
export class SystemWebController {
  constructor(
    @Inject(SystemWebService)
    private readonly systemService: SystemWebService,
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
  @ApiHeader({ name: 'x-token', description: '身份验证token', required: true })
  @ApiBody({
    description: '系统重启请求',
    schema: {
      type: 'object',
      properties: {},
    },
  })
  public async systemRestart(): Promise<string> {
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
  @ApiHeader({ name: 'x-token', description: '身份验证token', required: true })
  @ApiBody({
    description: '获取重启时间请求',
    schema: {
      type: 'object',
      properties: {},
    },
  })
  public async getRestartTime(): Promise<string> {
    return await this.systemService.getRestartTime();
  }
}
