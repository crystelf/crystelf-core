import { Module } from '@nestjs/common';
import { CdnController } from './cdn.controller';
import { CdnService } from './cdn.service';
import { PathModule } from '../../core/path/path.module';

@Module({
  imports: [PathModule],
  controllers: [CdnController],
  providers: [CdnService],
})
export class CdnModule {}
