import { Module } from '@nestjs/common';
import { RootModule } from './root/root.module';
import { AppConfigModule } from './config/config.module';
import { PathModule } from './core/path/path.module';

@Module({
  imports: [RootModule, AppConfigModule, PathModule],
})
export class AppModule {}
