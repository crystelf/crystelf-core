import { Injectable } from '@nestjs/common';
import { WsTools } from '../ws.tools';
import { IMessageHandler } from '../../../types/ws/ws.handlers.interface';
import { AuthenticatedSocket } from '../../../types/ws/ws.interface';

@Injectable()
export class TestHandler implements IMessageHandler {
  type = 'test';

  async handle(socket: AuthenticatedSocket, msg: any) {
    await WsTools.send(socket, {
      type: 'test',
      data: { status: 'ok' },
    });
  }
}
