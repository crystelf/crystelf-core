import { AuthenticatedSocket } from '../../types/ws';
import wsTools from '../../utils/ws/wsTools';
import { WebSocket } from 'ws';
import logger from '../../utils/core/logger';
import redisService from '../redis/redis';
import wsClientManager from './wsClientManager';

type MessageHandler = (socket: WebSocket, msg: any) => Promise<void>;

class WSMessageHandler {
  private handlers: Map<string, MessageHandler>;

  constructor() {
    this.handlers = new Map([
      ['test', this.handleTest],
      ['ping', this.handlePing],
      ['pong', this.handlePong],
      ['reportBots', this.handleReportBots],
    ]);
  }

  async handle(socket: AuthenticatedSocket, clientId: string, msg: any) {
    try {
      //如果是 pendingRequests 的回包
      if (msg.requestId && wsClientManager.resolvePendingRequest(msg.requestId, msg)) {
        return;
      }

      const handler = this.handlers.get(msg.type);

      if (handler) {
        await handler(socket, msg);
      } else {
        await this.handleUnknown(socket, msg);
      }
    } catch (err) {
      logger.error(`ws消息处理时出错： ${err}`);
      await wsTools.send(socket, {
        type: 'error',
        message: 'error message',
      });
    }
  }

  private async handleTest(socket: WebSocket, msg: any) {
    await wsTools.send(socket, {
      type: 'test',
      data: { status: 'ok' },
    });
  }

  private async handlePing(socket: WebSocket, msg: any) {
    await wsTools.send(socket, { type: 'pong' });
  }

  private async handlePong(socket: WebSocket, msg: any) {
    //logger.debug(`received pong`);
  }

  private async handleUnknown(socket: WebSocket, msg: any) {
    logger.warn(`收到未知消息类型: ${msg.type}`);
    await wsTools.send(socket, {
      type: 'error',
      message: `未知消息类型: ${msg.type}`,
    });
  }

  private async handleReportBots(socket: WebSocket, msg: any) {
    logger.debug(`received reportBots: ${msg.data}`);
    const clientId = msg.data[0].client;
    const botsData = msg.data.slice(1);
    await redisService.persistData('crystelfBots', botsData, clientId);
    logger.debug(`保存了 ${botsData.length} 个 bot（client: ${clientId}）`);
  }

  public registerHandler(type: string, handler: MessageHandler): void {
    this.handlers.set(type, handler);
  }
}

const wsHandler = new WSMessageHandler();
export default wsHandler;
