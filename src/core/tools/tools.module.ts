import { Module } from '@nestjs/common';
import { ToolsService } from './tools.service';
import { AppConfigModule } from '../../config/config.module';

@Module({
  imports: [AppConfigModule],
  providers: [ToolsService],
  exports: [ToolsService],
})
export class ToolsModule {}
