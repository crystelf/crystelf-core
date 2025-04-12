import WebSocket from 'ws';
import WsMessage from '../../types/wsMessage';

class WSMessageHandler {
  public async handle(socket: WebSocket, clientID: string, msg: WsMessage) {
    switch (msg.type) {
      case 'test':
        await this.reply(socket, { type: 'test', data: 'hi' });
        break;
      case 'ping':
        await this.reply(socket, { type: 'pong' });
        break;
      default:
        await this.reply(socket, { type: 'error', message: 'Unknown message' });
        break;
    }
  }

  private async reply(socket: WebSocket, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      socket.send(JSON.stringify(data), (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

const wsHandler = new WSMessageHandler();
export default wsHandler;
