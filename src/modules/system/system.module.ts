import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { SystemWebService } from './system.service';
import { ToolsModule } from '../../core/tools/tools.module';
import { PathModule } from '../../core/path/path.module';

@Module({
  imports: [ToolsModule, SystemModule, PathModule],
  controllers: [SystemController],
  providers: [SystemWebService],
})
export class SystemModule {}
