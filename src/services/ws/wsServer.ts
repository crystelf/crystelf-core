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
    this.wss.on('connection', (socket: AuthenticatedSocket, req) => {
      const ip = req.socket.remoteAddress || 'unknown';
      logger.info(`收到来自 ${ip} 的 WebSocket 连接请求..`);

      socket.heartbeat = WsTools.setUpHeartbeat(socket);

      socket.on('message', async (raw) => {
        logger.debug(`Received raw message from ${ip}: ${raw.toString()}`);

        const msg = WsTools.parseMessage<WSMessage>(raw);
        if (!msg) return this.handleInvalidMessage(socket, ip);

        await this.routeMessage(socket, msg, ip);
      });

      socket.on('close', () => {
        logger.info(`ws断开连接 ${ip} (${socket.clientId || 'unauthenticated'})`);
        this.handleDisconnect(socket);
      });

      socket.on('error', (err) => {
        logger.error(`WS error from ${ip}: ${err.message}`);
      });
    });
  }

  private async handleInvalidMessage(socket: WebSocket, ip: string) {
    logger.warn(`Invalid message received from ${ip}`);
    await WsTools.send(socket, {
      type: 'error',
      message: 'Invalid message format',
    });
  }

  private async routeMessage(socket: AuthenticatedSocket, msg: WSMessage, ip: string) {
    if (!socket.isAuthed) {
      if (this.isAuthMessage(msg)) {
        logger.info(`Attempting auth from ${ip} as ${msg.clientId}`);
        await this.handleAuth(socket, msg, ip);
      } else {
        logger.warn(`Received message before auth from ${ip}: ${JSON.stringify(msg)}`);
        await this.handleInvalidMessage(socket, ip);
      }
      return;
    }

    logger.debug(`Routing message from ${socket.clientId}: ${JSON.stringify(msg)}`);
    await wsHandler.handle(socket, socket.clientId!, msg);
  }

  private isAuthMessage(msg: WSMessage): msg is AuthMessage {
    return msg.type === 'auth';
  }

  private async handleAuth(socket: AuthenticatedSocket, msg: AuthMessage, ip: string) {
    if (msg.secret === this.secret) {
      socket.isAuthed = true;
      socket.clientId = msg.clientId;
      wsClientManager.add(msg.clientId, socket);
      logger.info(`Auth success from ${ip}, clientId: ${msg.clientId}`);
      await WsTools.send(socket, { type: 'auth', success: true });
    } else {
      logger.warn(`Auth failed from ${ip} (invalid secret), clientId: ${msg.clientId}`);
      await WsTools.send(socket, { type: 'auth', success: false });
    }
  }

  private handleDisconnect(socket: AuthenticatedSocket) {
    if (socket.heartbeat) clearInterval(socket.heartbeat);
    if (socket.clientId) {
      wsClientManager.remove(socket.clientId);
      logger.info(`Removed client ${socket.clientId} from manager`);
    }
  }
}

const wsServer = new WSServer();
export default wsServer;
