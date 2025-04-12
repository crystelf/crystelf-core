import WebSocket, { WebSocketServer } from 'ws';
import config from '../../utils/core/config';
import wsClientManager from './wsClientManager';
import wsHandler from './handler';
import logger from '../../utils/core/logger';

interface AuthenticatedSocket extends WebSocket {
  isAuthed?: boolean;
  clientId?: string;
}

class WSServer {
  private wss: WebSocketServer;
  private PORT = config.get('WS_PORT');
  private WS_SECRET = config.get('WS_SECRET');

  constructor() {
    this.wss = new WebSocketServer({ port: Number(this.PORT) });
    this.init();
    logger.info(`WebSocket Server started at ws://localhost:${this.PORT}`);
  }

  private init() {
    this.wss.on('connection', (socket: AuthenticatedSocket) => {
      socket.on('message', async (raw) => {
        let msg: any;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return this.send(socket, { type: 'error', message: 'JSON 解析失败' });
        }

        // 鉴权
        if (!socket.isAuthed) {
          if (msg.type === 'auth' && msg.secret === this.WS_SECRET && msg.clientId) {
            socket.isAuthed = true;
            socket.clientId = msg.clientId;
            wsClientManager.add(msg.clientId, socket);
            return this.send(socket, { type: 'auth', success: true });
          }
          return this.send(socket, { type: 'auth', success: false });
        }

        // 业务处理
        if (socket.clientId) {
          try {
            await wsHandler.handle(socket, socket.clientId, msg);
          } catch (e) {
            await this.send(socket, { type: 'error', message: '处理出错' });
          }
        }
      });

      socket.on('close', () => {
        if (socket.clientId) {
          wsClientManager.remove(socket.clientId);
        }
      });
    });
  }

  private async send(socket: WebSocket, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      socket.send(JSON.stringify(data), (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

const wsServer = new WSServer();
export default wsServer;
