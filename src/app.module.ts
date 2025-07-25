import { Module } from '@nestjs/common';
import { RootModule } from './root/root.module';
import { AppConfigModule } from './config/config.module';
import { PathModule } from './core/path/path.module';
import { SystemModule } from './core/system/system.module';
import { ToolsModule } from './core/tools/tools.module';

@Module({
  imports: [RootModule, AppConfigModule, PathModule, SystemModule, ToolsModule],
})
export class AppModule {}
