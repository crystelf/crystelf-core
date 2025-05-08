import WebSocket from 'ws';
import axios from 'axios';
import logger from '../utils/core/logger';

const WS_URL = 'ws://127.0.0.1:4001';
const WS_SECRET = '114514';
const CLIENT_ID = 'test';

function createWebSocketClient() {
  const socket = new WebSocket(WS_URL);

  socket.on('open', () => {
    console.log('[WS] Connected to server');

    const authPayload = {
      type: 'auth',
      secret: WS_SECRET,
      clientId: CLIENT_ID,
    };
    socket.send(JSON.stringify(authPayload));
  });

  socket.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    console.log('[WS] Message from server:', msg);

    if (msg.type === 'auth' && msg.success === true) {
      socket.send(JSON.stringify({ type: 'test' }));
    }
  });

  socket.on('close', () => {
    console.log('[WS] Connection closed');
  });

  socket.on('error', (err) => {
    console.error('[WS] Error:', err);
  });
}

async function testGetAPI() {
  try {
    const response = await axios.get('http://localhost:4000/api/sample/hello');
    console.log('[HTTP][GET] Response:', response.data);
  } catch (err) {
    console.error('[HTTP][GET] Error:', err);
  }
}

async function testPostAPI() {
  try {
    const response = await axios.post('https://core.crystelf.top/api/bot/getGroupInfo', {
      token: '阿弥诺斯',
      groupId: '1042721418',
    });
    logger.info('[HTTP][POST] Response:', response.data);
  } catch (err) {
    console.error('[HTTP][POST] Error:', err);
  }
}

async function main() {
  createWebSocketClient();

  setTimeout(() => {
    testPostAPI();
  }, 1000);
}

main();
