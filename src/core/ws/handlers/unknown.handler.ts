import { Injectable, Logger } from '@nestjs/common';
import { WsTools } from '../ws.tools';
import { IMessageHandler } from '../../../types/ws/ws.handlers.interface';
import { AuthenticatedSocket } from '../../../types/ws/ws.interface';

@Injectable()
export class UnknownHandler implements IMessageHandler {
  type = 'unknown';
  private readonly logger = new Logger(UnknownHandler.name);

  async handle(socket: AuthenticatedSocket, msg: any) {
    this.logger.warn(`收到未知消息类型: ${msg.type}`);
    await WsTools.send(socket, {
      type: 'error',
      message: `未知消息类型: ${msg.type}`,
    });
  }
}
