import { Module } from '@nestjs/common';
import { AutoUpdateService } from './auto-update.service';
import { PathModule } from '../path/path.module';

@Module({
  imports: [PathModule],
  providers: [AutoUpdateService],
  exports: [AutoUpdateService],
})
export class AutoUpdateModule {}
