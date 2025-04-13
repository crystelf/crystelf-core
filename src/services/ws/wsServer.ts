import WebSocket, { WebSocketServer } from 'ws';
import config from '../../utils/core/config';
import logger from '../../utils/core/logger';
import { AuthenticatedSocket, AuthMessage, WSMessage } from '../../types/ws';
import WsTools from '../../utils/ws/wsTools';
import wsHandler from './handler';
import { clearInterval } from 'node:timers';
import wsClientManager from './wsClientManager';

class WSServer {
  private readonly wss: WebSocketServer;
  private readonly port = Number(config.get('WS_PORT'));
  private readonly secret = config.get('WS_SECRET');

  constructor() {
    this.wss = new WebSocketServer({ port: this.port });
    this.init();
    logger.info(`WS Server listening on ws://localhost:${this.port}`);
  }

  private init(): void {
    this.wss.on('connection', (socket: AuthenticatedSocket) => {
      socket.heartbeat = WsTools.setUpHeartbeat(socket);

      socket.on('message', async (raw) => {
        const msg = WsTools.parseMessage<WSMessage>(raw);
        if (!msg) return this.handleInvalidMessage(socket);

        await this.routeMessage(socket, msg);
      });

      socket.on('close', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private async handleInvalidMessage(socket: WebSocket) {
    await WsTools.send(socket, {
      type: 'error',
      message: 'Invalid message format',
    });
  }

  private async routeMessage(socket: AuthenticatedSocket, msg: WSMessage) {
    if (!socket.isAuthed) {
      if (this.isAuthMessage(msg)) {
        await this.handleAuth(socket, msg);
      }
      return;
    }

    if (socket.clientId) {
      await wsHandler.handle(socket, socket.clientId, msg);
    }
  }

  private isAuthMessage(msg: WSMessage): msg is AuthMessage {
    return (
      msg.type === 'auth' &&
      typeof (msg as AuthMessage).secret === 'string' &&
      typeof (msg as AuthMessage).clientId === 'string'
    );
  }

  private async handleAuth(socket: AuthenticatedSocket, msg: AuthMessage) {
    if (msg.secret === this.secret) {
      socket.isAuthed = true;
      socket.clientId = msg.clientId;
      wsClientManager.add(msg.clientId, socket);
      await WsTools.send(socket, { type: 'auth', success: true });
    } else {
      await WsTools.send(socket, { type: 'auth', success: false });
    }
  }

  private handleDisconnect(socket: AuthenticatedSocket) {
    if (socket.heartbeat) clearInterval(socket.heartbeat);
    if (socket.clientId) wsClientManager.remove(socket.clientId);
  }
}

const wsServer = new WSServer();
export default wsServer;
