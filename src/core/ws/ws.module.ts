import { Module } from '@nestjs/common';
import { WsGateway } from './ws.gateway';
import { WsClientManager } from './ws-client.manager';
import { AppConfigModule } from '../../config/config.module';

@Module({
  imports: [AppConfigModule],
  providers: [WsGateway, WsClientManager],
  exports: [WsClientManager],
})
export class WsModule {}
