import { Module } from '@nestjs/common';
import { RedisModule } from '../../core/redis/redis.module';
import { WsModule } from '../../core/ws/ws.module';
import { ToolsModule } from '../../core/tools/tools.module';
import { PathModule } from '../../core/path/path.module';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';

@Module({
  imports: [RedisModule, WsModule, ToolsModule, PathModule],
  controllers: [BotController],
  providers: [BotService],
})
export class BotModule {}
