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
import { SystemWebModule } from './modules/system/systemWeb.module';
import { CdnModule } from './modules/cdn/cdn.module';
import { WordsModule } from './modules/words/words.module';
import { MemeModule } from './modules/meme/meme.module';
import { OpenListModule } from './core/openlist/openlist.module';

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
    SystemWebModule,
    CdnModule,
    WordsModule,
    MemeModule,
    OpenListModule,
  ],
})
export class AppModule {}
