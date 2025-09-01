import { Module } from '@nestjs/common';
import { MemeService } from './meme.service';
import { MemeController } from './meme.controller';
import { PathService } from '../../core/path/path.service';
import { PathModule } from '../../core/path/path.module';

@Module({
  imports: [PathModule],
  providers: [MemeService],
  controllers: [MemeController],
})
export class MemeModule {}
