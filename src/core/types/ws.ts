import WebSocket from 'ws';

export interface AuthenticatedSocket extends WebSocket {
  isAuthed?: boolean;
  clientId?: string;
  heartbeat?: NodeJS.Timeout;
}

export interface WSMessage {
  type: string;
  [key: string]: unknown;
}

export interface AuthMessage extends WSMessage {
  type: 'auth';
  secret: string;
  clientId: string;
}
