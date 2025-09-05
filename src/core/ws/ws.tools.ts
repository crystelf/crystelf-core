import type { WebSocket, RawData } from 'ws';
import { Logger } from '@nestjs/common';

export class WsTools {
  private static readonly logger = new Logger(WsTools.name);

  static async send(socket: WebSocket, data: unknown): Promise<boolean> {
    if (socket.readyState !== 1) {
      this.logger.warn('尝试向非 OPEN 状态的 socket 发送消息,已丢弃');
      return false;
    }

    return new Promise((resolve) => {
      try {
        socket.send(JSON.stringify(data), (err) => {
          if (err) {
            this.logger.error(`WS send error: ${err.message}`);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      } catch (err: any) {
        this.logger.error(`WS send exception: ${err.message}`);
        resolve(false);
      }
    });
  }

  static parseMessage<T>(data: RawData): T | null {
    try {
      return JSON.parse(data.toString()) as T;
    } catch (err) {
      this.logger.error(`WS parse error: ${err}`);
      return null;
    }
  }

  static setUpHeartbeat(socket: WebSocket, interval = 30000): NodeJS.Timeout {
    const heartbeat = async () => {
      if (socket.readyState === 1) {
        await WsTools.send(socket, { type: 'ping' });
      }
    };
    return setInterval(heartbeat, interval);
  }
}
