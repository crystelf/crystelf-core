import { Module } from '@nestjs/common';
import { RootModule } from './root/root.module';
import { AppConfigModule } from './config/config.module';
import { PathModule } from './core/path/path.module';
import { SystemModule } from './core/system/system.module';
import { ToolsModule } from './core/tools/tools.module';
import { AutoUpdateModule } from './core/auto-update/auto-update.module';
import { PersistenceModule } from './core/persistence/persistence.module';
import { RedisModule } from './core/redis/redis.module';
import { WsModule } from './core/ws/ws.module';

@Module({
  imports: [
    RootModule,
    AppConfigModule,
    PathModule,
    SystemModule,
    ToolsModule,
    PersistenceModule,
    AutoUpdateModule,
    RedisModule,
    WsModule,
  ],
})
export class AppModule {}
