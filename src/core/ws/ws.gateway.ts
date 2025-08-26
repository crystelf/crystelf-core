import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Inject, Logger } from '@nestjs/common';
import { Server, WebSocket } from 'ws';
import { WsTools } from './ws.tools';
import { WsClientManager } from './ws-client.manager';
import {
  AuthenticatedSocket,
  AuthMessage,
  WSMessage,
} from '../../types/ws/ws.interface';
import { AppConfigService } from '../../config/config.service';
import { WsMessageHandler } from './ws-message.handler';

@WebSocketGateway({
  cors: { origin: '*' },
  driver: 'ws',
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WsGateway.name);
  private readonly secret: string | undefined;

  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(AppConfigService)
    private readonly configService: AppConfigService,
    @Inject(WsClientManager)
    private readonly wsClientManager: WsClientManager,
    @Inject(WsMessageHandler)
    private readonly wsMessageHandler: WsMessageHandler,
  ) {
    this.secret = this.configService.get<string>('WS_SECRET');
  }

  /**
   * 新的连接请求
   * @param client 客户端
   * @param req
   */
  async handleConnection(client: AuthenticatedSocket, req: any) {
    const ip = req.socket.remoteAddress || 'unknown';
    this.logger.log(`收到来自 ${ip} 的 WebSocket 连接请求..`);

    client.heartbeat = WsTools.setUpHeartbeat(client);

    client.on('message', async (raw) => {
      this.logger.debug(`Received raw message from ${ip}: ${raw.toString()}`);

      const msg = WsTools.parseMessage<WSMessage>(raw);
      if (!msg) return this.handleInvalidMessage(client, ip);

      await this.routeMessage(client, msg, ip);
    });

    client.on('error', (err) => {
      this.logger.error(`WS error from ${ip}: ${err.message}`);
    });
  }

  /**
   * 断开某个连接
   * @param client 客户端
   */
  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.heartbeat) clearInterval(client.heartbeat);
    if (client.clientId) {
      this.wsClientManager.remove(client.clientId);
      this.logger.log(`Removed client ${client.clientId} from manager`);
    }
  }

  /**
   * 不合法消息
   * @param client 客户端
   * @param ip
   * @private
   */
  private async handleInvalidMessage(client: WebSocket, ip: string) {
    this.logger.warn(`Invalid message received from ${ip}`);
    await WsTools.send(client, {
      type: 'error',
      message: 'Invalid message format',
    });
  }

  /**
   * 消息路由
   * @param client 客户端
   * @param msg 消息
   * @param ip
   * @private
   */
  private async routeMessage(
    client: AuthenticatedSocket,
    msg: WSMessage,
    ip: string,
  ) {
    if (!client.isAuthed) {
      if (this.isAuthMessage(msg)) {
        this.logger.log(`Attempting auth from ${ip} as ${msg.clientId}`);
        await this.handleAuth(client, msg, ip);
      } else {
        this.logger.warn(
          `Received message before auth from ${ip}: ${JSON.stringify(msg)}`,
        );
        await this.handleInvalidMessage(client, ip);
      }
      return;
    }

    this.logger.debug(
      `Routing message from ${client.clientId}: ${JSON.stringify(msg)}`,
    );
    await this.wsMessageHandler.handle(client, client.clientId!, msg);
  }

  private isAuthMessage(msg: WSMessage): msg is AuthMessage {
    return msg.type === 'auth';
  }

  /**
   * 连接验证
   * @param client 客户端
   * @param msg 消息
   * @param ip
   * @private
   */
  private async handleAuth(
    client: AuthenticatedSocket,
    msg: AuthMessage,
    ip: string,
  ) {
    if (msg.secret === this.secret) {
      client.isAuthed = true;
      client.clientId = msg.clientId;
      this.wsClientManager.add(msg.clientId, client);
      this.logger.log(`Auth success from ${ip}, clientId: ${msg.clientId}`);
      await WsTools.send(client, { type: 'auth', success: true });
    } else {
      this.logger.warn(
        `Auth failed from ${ip} (invalid secret), clientId: ${msg.clientId}`,
      );
      await WsTools.send(client, { type: 'auth', success: false });
      client.close(4001, 'Authentication failed');
    }
  }
}
