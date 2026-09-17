import { WebSocket, WebSocketServer } from 'ws';
import { authenticateToken } from '../middleware/auth.js';

export const REALTIME_PATH = '/ws';

export const CLOSE = {
  AUTH_FAILED: 4001,
  AUTH_TIMEOUT: 4002,
  ACCOUNT_CLOSED: 4003,
};

const AUTH_TIMEOUT_MS = 5_000;
const HEARTBEAT_MS = 30_000;
const MAX_TIMEOUT_MS = 2 ** 31 - 1;
const MAX_PAYLOAD_BYTES = 16 * 1024;

const sockets = new Map();

let wss = null;

const register = (socket) => {
  let open = sockets.get(socket.userId);
  if (!open) {
    open = new Set();
    sockets.set(socket.userId, open);
  }
  open.add(socket);
};

const unregister = (socket) => {
  if (!socket.userId) return;

  const open = sockets.get(socket.userId);
  if (!open) return;

  open.delete(socket);
  if (open.size === 0) sockets.delete(socket.userId);
};

const send = (socket, frame) => {
  if (socket.readyState === WebSocket.OPEN) socket.send(frame);
};

const refuseUpgrade = (socket, status, text) => {
  socket.write(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
};

const authenticate = async (socket, raw, isBinary) => {
  let message;
  try {
    message = isBinary ? null : JSON.parse(raw.toString());
  } catch {
    message = null;
  }

  if (message?.type !== 'auth' || typeof message.token !== 'string') {
    socket.close(CLOSE.AUTH_FAILED, 'Send { type: "auth", token } first.');
    return;
  }

  let session;
  try {
    session = await authenticateToken(message.token);
  } catch (error) {
    socket.close(CLOSE.AUTH_FAILED, error.message?.slice(0, 120) || 'Authentication failed.');
    return;
  }

  if (socket.readyState !== WebSocket.OPEN) return;

  clearTimeout(socket.authTimer);
  socket.userId = String(session.user._id);
  register(socket);

  if (session.payload.exp) {
    const remaining = session.payload.exp * 1000 - Date.now();
    socket.expiryTimer = setTimeout(
      () => socket.close(CLOSE.AUTH_FAILED, 'Your session has expired.'),
      Math.min(Math.max(remaining, 0), MAX_TIMEOUT_MS),
    );
  }

  send(socket, JSON.stringify({ type: 'ready', data: { userId: socket.userId } }));
};

const onConnection = (socket) => {
  socket.userId = null;
  socket.isAlive = true;

  socket.authTimer = setTimeout(
    () => socket.close(CLOSE.AUTH_TIMEOUT, 'Authentication timed out.'),
    AUTH_TIMEOUT_MS,
  );

  socket.on('pong', () => {
    socket.isAlive = true;
  });

  socket.on('message', (raw, isBinary) => {
    if (socket.userId || socket.authenticating) return;

    socket.authenticating = true;
    authenticate(socket, raw, isBinary).finally(() => {
      socket.authenticating = false;
    });
  });

  socket.on('close', () => {
    clearTimeout(socket.authTimer);
    clearTimeout(socket.expiryTimer);
    unregister(socket);
  });

  socket.on('error', (error) => {
    console.error('WebSocket error:', error.message);
  });
};

const startHeartbeat = () =>
  setInterval(() => {
    for (const socket of wss.clients) {
      if (!socket.isAlive) {
        socket.terminate();
        continue;
      }

      socket.isAlive = false;
      socket.ping();
    }
  }, HEARTBEAT_MS);

export const attachRealtime = (server, { allowedOrigins = [] } = {}) => {
  wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD_BYTES });
  wss.on('connection', onConnection);

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url, 'http://localhost');
    if (pathname !== REALTIME_PATH) {
      refuseUpgrade(socket, 404, 'Not Found');
      return;
    }

    const { origin } = request.headers;
    if (origin && !allowedOrigins.includes(origin)) {
      refuseUpgrade(socket, 403, 'Forbidden');
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
  });

  const heartbeat = startHeartbeat();
  wss.on('close', () => clearInterval(heartbeat));

  return wss;
};

export const emitToUser = (userId, type, data) => {
  const open = sockets.get(String(userId));
  if (!open) return;

  const frame = JSON.stringify({ type, data });
  for (const socket of open) send(socket, frame);
};

export const emitToUsers = (userIds, type, data) => {
  const frame = JSON.stringify({ type, data });

  for (const id of new Set(userIds.map(String))) {
    const open = sockets.get(id);
    if (!open) continue;
    for (const socket of open) send(socket, frame);
  }
};

export const isOnline = (userId) => sockets.has(String(userId));

export const disconnectUser = (userId, code, reason) => {
  const open = sockets.get(String(userId));
  if (!open) return;

  for (const socket of [...open]) socket.close(code, reason);
};
