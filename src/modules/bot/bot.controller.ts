import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';
import { BotService } from './bot.service';
import { WsClientManager } from 'src/core/ws/ws-client.manager';
import { TokenAuthGuard } from 'src/core/tools/token-auth.guard';
import {
  BroadcastDto,
  GroupInfoDto,
  SendMessageDto,
  TokenDto,
} from './bot.dto';

@ApiTags('Bot相关操作')
@Controller('bot')
export class BotController {
  constructor(
    @Inject(BotService)
    private readonly botService: BotService,
    @Inject(WsClientManager)
    private readonly wsClientManager: WsClientManager,
  ) {}

  @Post('getBotId')
  @UseGuards(TokenAuthGuard)
  @ApiOperation({ summary: '获取当前连接到核心的全部 botId 数组' })
  async postBotsId(@Body() dto: TokenDto) {
    return this.botService.getBotId();
  }

  @Post('getGroupInfo')
  @UseGuards(TokenAuthGuard)
  @ApiOperation({ summary: '获取群聊信息' })
  @ApiBody({ type: GroupInfoDto })
  async postGroupInfo(@Body() dto: GroupInfoDto) {
    return this.botService.getGroupInfo({ groupId: dto.groupId });
  }

  @Post('reportBots')
  @UseGuards(TokenAuthGuard)
  @ApiOperation({ summary: '广播：要求同步群聊信息和 bot 连接情况' })
  async reportBots(@Body() dto: TokenDto) {
    const sendMessage = {
      type: 'reportBots',
      data: {},
    };
    await this.wsClientManager.broadcast(sendMessage);
    return { message: '正在请求同步 bot 数据..' };
  }

  @Post('sendMessage')
  @UseGuards(TokenAuthGuard)
  @ApiOperation({ summary: '发送消息到群聊', description: '自动选择bot发送' })
  @ApiBody({ type: SendMessageDto })
  async sendMessage(@Body() dto: SendMessageDto) {
    const flag = await this.botService.sendMessage(dto.groupId, dto.message);
    if (!flag) {
      return { message: '消息发送失败' };
    }
    return { message: '消息发送成功' };
  }

  @Post('broadcast')
  @UseGuards(TokenAuthGuard)
  @ApiOperation({ summary: '广播消息到全部群聊', description: '随机延迟' })
  @ApiBody({ type: BroadcastDto })
  async smartBroadcast(@Body() dto: BroadcastDto) {
    await this.botService.broadcastToAllGroups(dto.message);
    return { message: '广播任务已开始，正在后台执行..' };
  }
}
