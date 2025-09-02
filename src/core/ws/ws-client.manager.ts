import { Injectable } from '@nestjs/common';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

type ClientID = string;
const pendingRequests = new Map<string, (data: any) => void>();

/**
 * 客户端管理
 */
@Injectable()
export class WsClientManager {
  private clients = new Map<ClientID, WebSocket>();

  /**
   * 增添新的客户端
   * @param id 编号
   * @param socket 客户端
   */
  public add(id: ClientID, socket: WebSocket) {
    this.clients.set(id, socket);
  }

  /**
   * 移除客户端
   * @param id 编号
   */
  public remove(id: ClientID) {
    this.clients.delete(id);
  }

  /**
   * 获取客户端单例
   * @param id 编号
   */
  public get(id: ClientID): WebSocket | undefined {
    return this.clients.get(id);
  }

  /**
   * 发送消息到客户端
   * @param id 编号
   * @param data 要发送的信息
   */
  public async send(id: ClientID, data: any): Promise<boolean> {
    const socket = this.clients.get(id);
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    return this.safeSend(socket, data);
  }

  /**
   * 发送消息并等待返回
   * @param id 编号
   * @param data 消息
   * @param timeout
   */
  public async sendAndWait(
    id: ClientID,
    data: any,
    timeout = 5000,
  ): Promise<any> {
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

  /**
   * 处理回调
   * @param requestId 请求id
   * @param data 内容
   */
  public resolvePendingRequest(requestId: string, data: any): boolean {
    const callback = pendingRequests.get(requestId);
    if (callback) {
      pendingRequests.delete(requestId);
      callback(data);
      return true;
    }
    return false;
  }

  /**
   * 广播消息
   * @param data 内容
   */
  public async broadcast(data: any): Promise<void> {
    const tasks = Array.from(this.clients.values()).map((socket) => {
      if (socket.readyState === WebSocket.OPEN) {
        return this.safeSend(socket, data);
      } else {
        return Promise.resolve();
      }
    });
    await Promise.all(tasks);
  }

  /**
   * 安全发送
   * @param socket
   * @param data
   * @private
   */
  private async safeSend(socket: WebSocket, data: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      socket.send(JSON.stringify(data), (err) => {
        if (err) reject(new Error('发送失败'));
        else resolve(true);
      });
    });
  }
}
