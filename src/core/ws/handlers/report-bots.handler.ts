import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { IMessageHandler } from '../../../types/ws/ws.handlers.interface';
import { RedisService } from '../../redis/redis.service';
import { AuthenticatedSocket } from '../../../types/ws/ws.interface';

@Injectable()
export class ReportBotsHandler implements IMessageHandler {
  type = 'reportBots';
  private readonly logger = new Logger(ReportBotsHandler.name);

  constructor(
    @Inject(RedisService)
    private readonly redisService: RedisService,
  ) {}

  async handle(socket: AuthenticatedSocket, msg: any) {
    this.logger.debug(`received reportBots: ${msg.data}`);
    const clientId = msg.data[0].client;
    const botsData = msg.data.slice(1);
    await this.redisService.persistData('crystelfBots', botsData, clientId);
    this.logger.debug(
      `保存了 ${botsData.length} 个 bot（client: ${clientId}）`,
    );
  }
}
