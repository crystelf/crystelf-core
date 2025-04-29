import WebSocket from 'ws';
import logger from '../core/logger';
import { setInterval } from 'node:timers';

class WsTools {
  /**
   * 发送消息
   * @param socket
   * @param data
   */
  static async send(socket: WebSocket, data: unknown): Promise<boolean> {
    if (socket.readyState !== WebSocket.OPEN) return false;

    return new Promise((resolve) => {
      socket.send(JSON.stringify(data), (err) => {
        resolve(!err);
      });
    });
  }

  /**
   * 解析消息
   * @param data
   */
  static parseMessage<T>(data: WebSocket.RawData): T | null {
    try {
      return JSON.parse(data.toString()) as T;
    } catch (err) {
      logger.error(err);
      return null;
    }
  }

  /**
   * 心跳检测
   * @param socket
   * @param interval
   */
  static setUpHeartbeat(socket: WebSocket, interval = 30000): NodeJS.Timeout {
    const heartbeat = () => {
      if (socket.readyState === WebSocket.OPEN) {
        WsTools.send(socket, { type: 'ping' });
      }
    };
    return setInterval(heartbeat, interval);
  }
}

export default WsTools;
