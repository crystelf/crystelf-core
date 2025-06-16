import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { clearTimeout } from 'node:timers';

type ClientID = string;
const pendingRequests = new Map<string, (data: any) => void>();

class WSClientManager {
  private clients = new Map<ClientID, WebSocket>();

  /**
   * 添加ws客户端实例
   * @param id 标识符
   * @param socket
   */
  public add(id: ClientID, socket: WebSocket) {
    this.clients.set(id, socket);
  }

  /**
   * 移除ws客户端实例
   * @param id
   */
  public remove(id: ClientID) {
    this.clients.delete(id);
  }

  /**
   * 获取ws客户端实例
   * @param id
   */
  public get(id: ClientID): WebSocket | undefined {
    return this.clients.get(id);
  }

  /**
   * 发送消息到ws客户端
   * @param id ws客户端标识符
   * @param data 要发送的内容
   */
  public async send(id: ClientID, data: any): Promise<boolean> {
    const socket = this.clients.get(id);
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    return this.safeSend(socket, data);
  }

  /**
   * ws发送请求&等待回调
   * @param id ws客户端标识符-id
   * @param data 发送的信息
   * @param timeout 超时时间 默认5秒
   */
  public async sendAndWait(id: ClientID, data: any, timeout = 5000): Promise<any> {
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
   * @param requestId
   * @param data
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
   * 广播消息到全部ws客户端
   * @param data 消息
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
   * 安全发送消息到ws客户端
   * @param socket ws客户端
   * @param data 发送的内容，会自动格式化
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

const wsClientManager = new WSClientManager();
export default wsClientManager;
