import { Module } from '@nestjs/common';
import { WordsController } from './words.controller';
import { WordsService } from './words.service';
import { PathModule } from '../../core/path/path.module';
import { ToolsModule } from '../../core/tools/tools.module';

@Module({
  imports: [PathModule, ToolsModule],
  controllers: [WordsController],
  providers: [WordsService],
  exports: [WordsService],
})
export class WordsModule {}
