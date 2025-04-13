import { AuthenticatedSocket } from '../../types/ws';
import wsTools from '../../utils/ws/wsTools';
import * as ws from 'ws';

type WebSocket = ws.WebSocket;

class WSMessageHandler {
  async handle(socket: AuthenticatedSocket, clientId: string, msg: any) {
    try {
      switch (msg.type) {
        case 'test':
          await this.handleTest(socket);
          break;
        case 'ping':
          await wsTools.send(socket, { type: 'pong' });
          break;
        default:
          await this.handleUnknown(socket);
      }
    } catch (err) {
      await wsTools.send(socket, {
        type: 'error',
        message: 'Processing failed',
      });
    }
  }

  private async handleTest(socket: WebSocket) {
    await wsTools.send(socket, {
      type: 'test',
      data: { status: 'ok' },
    });
  }

  private async handleUnknown(socket: WebSocket) {
    await wsTools.send(socket, {
      type: 'error',
      message: 'Unknown message type',
    });
  }
}

const wsHandler = new WSMessageHandler();
export default wsHandler;
