import { Module } from '@nestjs/common';
import { MemeService } from './meme.service';
import { MemeController } from './meme.controller';
import { PathModule } from '../../core/path/path.module';
import { ToolsModule } from '../../core/tools/tools.module';
import { RedisModule } from '../../core/redis/redis.module';
import { OpenListModule } from '../../core/openlist/openlist.module';

@Module({
  imports: [PathModule, OpenListModule, ToolsModule, RedisModule],
  providers: [MemeService],
  controllers: [MemeController],
})
export class MemeModule {}
