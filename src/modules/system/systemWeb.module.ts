import { Module } from '@nestjs/common';
import { SystemWebController } from './systemWeb.controller';
import { SystemWebService } from './systemWeb.service';
import { ToolsModule } from '../../core/tools/tools.module';
import { PathModule } from '../../core/path/path.module';
import { SystemModule } from '../../core/system/system.module';

@Module({
  imports: [ToolsModule, SystemModule, PathModule],
  controllers: [SystemWebController],
  providers: [SystemWebService],
})
export class SystemWebModule {}
