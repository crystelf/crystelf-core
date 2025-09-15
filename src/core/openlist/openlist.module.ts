import { Module } from '@nestjs/common';
import { OpenListService } from './openlist.service';
import { AppConfigModule } from '../../config/config.module';

@Module({
  imports: [AppConfigModule],
  providers: [OpenListService],
  exports: [OpenListService],
})
export class OpenListModule {}
