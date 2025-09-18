import { Module } from '@nestjs/common';
import { CdnController } from './cdn.controller';
import { CdnService } from './cdn.service';
import { PathModule } from '../../core/path/path.module';
import { OpenListModule } from '../../core/openlist/openlist.module';
import { AppConfigModule } from '../../config/config.module';
import { FilesModule } from '../../core/files/files.module';

@Module({
  imports: [PathModule, OpenListModule, AppConfigModule, FilesModule],
  controllers: [CdnController],
  providers: [CdnService],
})
export class CdnModule {}
