import { Module } from '@nestjs/common';
import { PersistenceService } from './persistence.service';
import { PathModule } from '../path/path.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [PathModule, FilesModule],
  providers: [PersistenceService],
  exports: [PersistenceService],
})
export class PersistenceModule {}
