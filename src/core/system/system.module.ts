import { Module } from '@nestjs/common';
import { SystemService } from './system.service';
import { PathModule } from '../path/path.module';
import { AutoUpdateModule } from '../auto-update/auto-update.module';

@Module({
  imports: [PathModule, AutoUpdateModule],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}
