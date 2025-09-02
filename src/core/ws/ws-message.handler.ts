import { Inject, Injectable, Logger } from '@nestjs/common';
import { WsTools } from './ws.tools';
import { WsClientManager } from './ws-client.manager';
import { IMessageHandler } from '../../types/ws/ws.handlers.interface';
import { AuthenticatedSocket } from '../../types/ws/ws.interface';

@Injectable()
export class WsMessageHandler {
  private readonly logger = new Logger(WsMessageHandler.name);
  private handlers = new Map<string, IMessageHandler>();

  constructor(
    private readonly wsClientManager: WsClientManager,
    @Inject('WS_HANDLERS') handlers: IMessageHandler[],
  ) {
    handlers.forEach((h) => this.handlers.set(h.type, h));
    this.logger.log(`已注册 ${handlers.length} 个 WS handler`);
  }

  public async handle(socket: AuthenticatedSocket, clientId: string, msg: any) {
    try {
      // 如果是 pendingRequests 的回包
      if (
        msg.requestId &&
        this.wsClientManager.resolvePendingRequest(msg.requestId, msg)
      ) {
        return;
      }
      const handler =
        this.handlers.get(msg.type) || this.handlers.get('unknown');
      if (handler) {
        await handler.handle(socket, msg);
      } else {
        await this.handleUnknown(socket, msg);
      }
    } catch (err) {
      this.logger.error(`ws消息处理时出错： ${err}`);
      await WsTools.send(socket, {
        type: 'error',
        message: 'error message',
      });
    }
  }

  private async handleUnknown(socket: AuthenticatedSocket, msg: any) {
    this.logger.warn(`收到未知消息类型: ${msg.type}`);
    await WsTools.send(socket, {
      type: 'error',
      message: `未知消息类型: ${msg.type}`,
    });
  }

  public registerHandler(handler: IMessageHandler): void {
    this.handlers.set(handler.type, handler);
  }
}
