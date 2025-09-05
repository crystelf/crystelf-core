import { Module } from '@nestjs/common';
import { MemeService } from './meme.service';
import { MemeController } from './meme.controller';
import { PathModule } from '../../core/path/path.module';
import { AutoUpdateModule } from '../../core/auto-update/auto-update.module';
import { ToolsModule } from '../../core/tools/tools.module';
import { RedisModule } from '../../core/redis/redis.module';

@Module({
  imports: [PathModule, AutoUpdateModule, ToolsModule, RedisModule],
  providers: [MemeService],
  controllers: [MemeController],
})
export class MemeModule {}
