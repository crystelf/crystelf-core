import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { AppConfigModule } from '../../config/config.module';
import { ToolsModule } from '../tools/tools.module';
import { PersistenceModule } from '../persistence/persistence.module';

@Module({
  imports: [AppConfigModule, ToolsModule, PersistenceModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
