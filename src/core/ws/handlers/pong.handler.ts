import { Injectable } from '@nestjs/common';
import { AuthenticatedSocket } from '../../../types/ws/ws.interface';
import { IMessageHandler } from '../../../types/ws/ws.handlers.interface';

@Injectable()
export class PongHandler implements IMessageHandler {
  type = 'pong';

  async handle(socket: AuthenticatedSocket, msg: any) {
    //this.logger.debug(`收到 pong 消息: ${JSON.stringify(msg)}`);
  }
}
