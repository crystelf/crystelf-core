import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { AppConfigService } from './config.service';
import * as path from 'node:path';

@Module({
  imports: [
    NestConfigModule.forRoot({
      envFilePath: path.resolve(__dirname, '../../.env'),
      isGlobal: true,
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
