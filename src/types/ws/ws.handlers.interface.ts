import { AuthenticatedSocket } from './ws.interface';

export interface IMessageHandler {
  type: string; //消息类型
  handle(socket: AuthenticatedSocket, msg: any): Promise<void>;
}
