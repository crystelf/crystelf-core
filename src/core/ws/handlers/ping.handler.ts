import { Injectable } from '@nestjs/common';
import { WsTools } from '../ws.tools';
import { IMessageHandler } from 'src/types/ws/ws.handlers.interface';
import { AuthenticatedSocket } from '../../../types/ws/ws.interface';

@Injectable()
export class PingHandler implements IMessageHandler {
  type = 'ping';
  async handle(socket: AuthenticatedSocket, msg: any) {
    await WsTools.send(socket, { type: 'pong' });
  }
}
