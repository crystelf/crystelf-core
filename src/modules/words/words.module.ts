import { Module } from '@nestjs/common';
import { WordsController } from './words.controller';
import { WordsService } from './words.service';
import { PathModule } from '../../core/path/path.module';
import { ToolsModule } from '../../core/tools/tools.module';
import { AutoUpdateModule } from '../../core/auto-update/auto-update.module';

@Module({
  imports: [PathModule, ToolsModule, AutoUpdateModule],
  controllers: [WordsController],
  providers: [WordsService],
  exports: [WordsService],
})
export class WordsModule {}
