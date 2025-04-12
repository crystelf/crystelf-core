import WebSocket from 'ws';

type ClientID = string;

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

  public async broadcast(payload: any): Promise<void> {
    const tasks = Array.from(this.clients.values()).map((socket) => {
      socket.readyState === WebSocket.OPEN ? this.safeSend(socket, payload) : Promise.resolve();
    });
    await Promise.all(tasks);
  }

  private async safeSend(socket: WebSocket, data: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      socket.send(JSON.stringify(data), (err) => {
        if (err) reject(false);
        else resolve(true);
      });
    });
  }
}

const wsClientManager = new WSClientManager();
export default wsClientManager;
