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
import { AuthenticatedSocket, AuthMessage, WSMessage } from '../../types/ws';
import { AppConfigService } from '../../config/config.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WsGateway.name);
  private readonly secret: string | undefined;

  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(AppConfigService)
    private readonly configService: AppConfigService,
    private readonly wsClientManager: WsClientManager,
  ) {
    this.secret = this.configService.get<string>('WS_SECRET');
  }

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

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.heartbeat) clearInterval(client.heartbeat);
    if (client.clientId) {
      this.wsClientManager.remove(client.clientId);
      this.logger.log(`Removed client ${client.clientId} from manager`);
    }
  }

  private async handleInvalidMessage(client: WebSocket, ip: string) {
    this.logger.warn(`Invalid message received from ${ip}`);
    await WsTools.send(client, {
      type: 'error',
      message: 'Invalid message format',
    });
  }

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
    // TODO: 注入 handler 服务
  }

  private isAuthMessage(msg: WSMessage): msg is AuthMessage {
    return msg.type === 'auth';
  }

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
