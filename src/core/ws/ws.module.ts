import { Module } from '@nestjs/common';
import { WsGateway } from './ws.gateway';
import { WsClientManager } from './ws-client.manager';
import { AppConfigModule } from '../../config/config.module';
import { WsMessageHandler } from './ws-message.handler';
import { TestHandler } from './handlers/test.handler';
import { PingHandler } from './handlers/ping.handler';
import { PongHandler } from './handlers/pong.handler';
import { ReportBotsHandler } from './handlers/report-bots.handler';
import { UnknownHandler } from './handlers/unknown.handler';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [AppConfigModule, RedisModule],
  providers: [
    WsGateway,
    WsClientManager,
    WsMessageHandler,
    TestHandler,
    PingHandler,
    PongHandler,
    ReportBotsHandler,
    UnknownHandler,
    {
      provide: 'WS_HANDLERS',
      useFactory: (
        test: TestHandler,
        ping: PingHandler,
        pong: PongHandler,
        reportBots: ReportBotsHandler,
        unknown: UnknownHandler,
      ) => [test, ping, pong, reportBots, unknown],
      inject: [
        TestHandler,
        PingHandler,
        PongHandler,
        ReportBotsHandler,
        UnknownHandler,
      ],
    },
  ],
  exports: [WsClientManager, WsMessageHandler, WsGateway],
})
export class WsModule {}
