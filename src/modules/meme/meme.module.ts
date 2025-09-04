import { Module } from '@nestjs/common';
import { MemeService } from './meme.service';
import { MemeController } from './meme.controller';
import { PathModule } from '../../core/path/path.module';
import { AutoUpdateModule } from '../../core/auto-update/auto-update.module';

@Module({
  imports: [PathModule, AutoUpdateModule],
  providers: [MemeService],
  controllers: [MemeController],
})
export class MemeModule {}
