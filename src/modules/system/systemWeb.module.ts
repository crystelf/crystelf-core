import { Module } from '@nestjs/common';
import { SystemWebController } from './systemWeb.controller';
import { SystemWebService } from './systemWeb.service';
import { PathModule } from '../../core/path/path.module';
import { SystemModule } from '../../core/system/system.module';
import { ToolsModule } from '../../core/tools/tools.module';

@Module({
  imports: [SystemModule, PathModule, ToolsModule],
  controllers: [SystemWebController],
  providers: [SystemWebService],
})
export class SystemWebModule {}
