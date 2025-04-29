import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { clearTimeout } from 'node:timers';

type ClientID = string;
const pendingRequests = new Map<string, (data: any) => void>();

class WSClientManager {
  private clients = new Map<ClientID, WebSocket>();

  public add(id: ClientID, socket: WebSocket) {
    this.clients.set(id, socket);
  }

  public remove(id: ClientID) {
    this.clients.delete(id);
  }

  public get(id: ClientID): WebSocket | undefined {
    return this.clients.get(id);
  }

  public async send(id: ClientID, payload: any): Promise<boolean> {
    const socket = this.clients.get(id);
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    return this.safeSend(socket, payload);
  }

  public async sendAndWait(id: ClientID, payload: any, timeout = 5000): Promise<any> {
    const socket = this.clients.get(id);
    if (!socket) return;

    payload.requestId = uuidv4();
    const requestId = payload.requestId;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error(`${requestId}: 请求超时`));
      }, timeout);

      pendingRequests.set(requestId, (response) => {
        clearTimeout(timer);
        pendingRequests.delete(requestId);
        resolve(response);
      });

      this.safeSend(socket, payload).catch((err) => {
        clearTimeout(timer);
        pendingRequests.delete(requestId);
        reject(err);
      });
    });
  }

  public resolvePendingRequest(requestId: string, data: any): boolean {
    const callback = pendingRequests.get(requestId);
    if (callback) {
      pendingRequests.delete(requestId);
      callback(data);
      return true;
    }
    return false;
  }

  public async broadcast(payload: any): Promise<void> {
    const tasks = Array.from(this.clients.values()).map((socket) => {
      if (socket.readyState === WebSocket.OPEN) {
        return this.safeSend(socket, payload);
      } else {
        return Promise.resolve();
      }
    });
    await Promise.all(tasks);
  }

  private async safeSend(socket: WebSocket, data: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      socket.send(JSON.stringify(data), (err) => {
        if (err) reject(new Error('发送失败'));
        else resolve(true);
      });
    });
  }
}

const wsClientManager = new WSClientManager();
export default wsClientManager;
