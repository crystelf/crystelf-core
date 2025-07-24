import { Module } from '@nestjs/common';
import { PathService } from './path.service';

@Module({
  providers: [PathService],
  exports: [PathService],
})
export class PathModule {}
