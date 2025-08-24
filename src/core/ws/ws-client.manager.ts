import { Injectable } from '@nestjs/common';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

type ClientID = string;
const pendingRequests = new Map<string, (data: any) => void>();

@Injectable()
export class WsClientManager {
  private clients = new Map<ClientID, WebSocket>();

  add(id: ClientID, socket: WebSocket) {
    this.clients.set(id, socket);
  }

  remove(id: ClientID) {
    this.clients.delete(id);
  }

  get(id: ClientID): WebSocket | undefined {
    return this.clients.get(id);
  }

  async send(id: ClientID, data: any): Promise<boolean> {
    const socket = this.clients.get(id);
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    return this.safeSend(socket, data);
  }

  async sendAndWait(id: ClientID, data: any, timeout = 5000): Promise<any> {
    const socket = this.clients.get(id);
    if (!socket) return;

    data.requestId = uuidv4();
    const requestId = data.requestId;

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

      this.safeSend(socket, data).catch((err) => {
        clearTimeout(timer);
        pendingRequests.delete(requestId);
        reject(err);
      });
    });
  }

  resolvePendingRequest(requestId: string, data: any): boolean {
    const callback = pendingRequests.get(requestId);
    if (callback) {
      pendingRequests.delete(requestId);
      callback(data);
      return true;
    }
    return false;
  }

  async broadcast(data: any): Promise<void> {
    const tasks = Array.from(this.clients.values()).map((socket) => {
      if (socket.readyState === WebSocket.OPEN) {
        return this.safeSend(socket, data);
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
