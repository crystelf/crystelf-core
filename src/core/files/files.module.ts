import { Module } from '@nestjs/common';
import { PathModule } from '../path/path.module';
import { FilesService } from './files.service';

@Module({
  imports: [PathModule],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
