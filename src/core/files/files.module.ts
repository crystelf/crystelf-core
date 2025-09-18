import { Module } from '@nestjs/common';
import { PathModule } from '../path/path.module';
import { FilesService } from './files.service';
import { OpenListModule } from '../openlist/openlist.module';
import { AppConfigModule } from '../../config/config.module';

@Module({
  imports: [PathModule, OpenListModule, AppConfigModule],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
