import WebSocket from 'ws';
import { Logger } from '@nestjs/common';

export class WsTools {
  private static readonly logger = new Logger(WsTools.name);

  static async send(socket: WebSocket, data: unknown): Promise<boolean> {
    if (socket.readyState !== WebSocket.OPEN) return false;

    return new Promise((resolve) => {
      socket.send(JSON.stringify(data), (err) => {
        resolve(!err);
      });
    });
  }

  static parseMessage<T>(data: WebSocket.RawData): T | null {
    try {
      return JSON.parse(data.toString()) as T;
    } catch (err) {
      this.logger.error(`WS parse error: ${err}`);
      return null;
    }
  }

  static setUpHeartbeat(socket: WebSocket, interval = 30000): NodeJS.Timeout {
    const heartbeat = () => {
      if (socket.readyState === WebSocket.OPEN) {
        WsTools.send(socket, { type: 'ping' });
      }
    };
    return setInterval(heartbeat, interval);
  }
}
