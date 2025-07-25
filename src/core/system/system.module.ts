import { Module } from '@nestjs/common';
import { SystemService } from './system.service';
import { PathModule } from '../path/path.module';

@Module({
  imports: [PathModule],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}
