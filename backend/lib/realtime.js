import { WebSocket, WebSocketServer } from 'ws';
import { authenticateToken } from '../middleware/auth.js';
import { createBus } from './bus/index.js';

export const REALTIME_PATH = '/ws';

export const CLOSE = {
  POLICY_VIOLATION: 1008,
  UNAVAILABLE: 1011,
  AUTH_FAILED: 4001,
  AUTH_TIMEOUT: 4002,
  ACCOUNT_CLOSED: 4003,
};

const AUTH_TIMEOUT_MS = 5_000;
const HEARTBEAT_MS = 30_000;
const OFFLINE_GRACE_MS = 5_000;
const MAX_TIMEOUT_MS = 2 ** 31 - 1;
const MAX_PAYLOAD_BYTES = 16 * 1024;
const MAX_TOPICS_PER_SOCKET = 50;
const RATE_WINDOW_MS = 10_000;
const RATE_LIMIT = 40;

const userSockets = new Map();
const topicSockets = new Map();
const messageHandlers = new Map();
const presenceListeners = [];
let topicAuthorizer = async () => false;

let wss = null;
let bus = null;

const addTo = (map, key, socket) => {
  let sockets = map.get(key);
  if (!sockets) {
    sockets = new Set();
    map.set(key, sockets);
  }
  sockets.add(socket);
};

const removeFrom = (map, key, socket) => {
  const sockets = map.get(key);
  if (!sockets) return;

  sockets.delete(socket);
  if (sockets.size === 0) map.delete(key);
};

const send = (socket, frame) => {
  if (socket.readyState === WebSocket.OPEN) socket.send(frame);
};

const sendAll = (sockets, frame) => {
  if (!sockets) return;
  for (const socket of sockets) send(socket, frame);
};

const deliver = (message) => {
  switch (message.kind) {
    case 'user':
      sendAll(userSockets.get(message.userId), message.frame);
      break;
    case 'users':
      for (const userId of message.userIds) sendAll(userSockets.get(userId), message.frame);
      break;
    case 'topic':
      sendAll(topicSockets.get(message.topic), message.frame);
      break;
    case 'disconnect':
      for (const socket of [...(userSockets.get(message.userId) ?? [])]) {
        socket.close(message.code, message.reason);
      }
      break;
  }
};

const logFailure = (label) => (error) => console.error(`${label}:`, error.message);

const notifyPresence = (userId, online) => {
  for (const listener of presenceListeners) {
    Promise.resolve()
      .then(() => listener(userId, online))
      .catch(logFailure('Presence listener failed'));
  }
};

const refuseUpgrade = (socket, status, text) => {
  socket.write(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
};

const parse = (raw, isBinary) => {
  if (isBinary) return null;
  try {
    return JSON.parse(raw.toString());
  } catch {
    return null;
  }
};

const withinRate = (socket) => {
  const now = Date.now();
  if (now - socket.rateStartedAt > RATE_WINDOW_MS) {
    socket.rateStartedAt = now;
    socket.rateCount = 0;
  }

  socket.rateCount += 1;
  return socket.rateCount <= RATE_LIMIT;
};

const register = async (socket) => {
  addTo(userSockets, socket.userId, socket);
  if (await bus.presenceUp(socket.userId)) notifyPresence(socket.userId, true);
};

const unregister = (socket) => {
  for (const topic of socket.topics) removeFrom(topicSockets, topic, socket);
  socket.topics.clear();

  const { userId } = socket;
  if (!userId) return;

  removeFrom(userSockets, userId, socket);

  setTimeout(() => {
    bus
      .presenceDown(userId)
      .then((wentOffline) => wentOffline && notifyPresence(userId, false))
      .catch(logFailure('Presence update failed'));
  }, OFFLINE_GRACE_MS).unref();
};

const authenticate = async (socket, message) => {
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
  socket.userName = session.user.name;
  await register(socket);

  if (session.payload.exp) {
    const remaining = session.payload.exp * 1000 - Date.now();
    socket.expiryTimer = setTimeout(
      () => socket.close(CLOSE.AUTH_FAILED, 'Your session has expired.'),
      Math.min(Math.max(remaining, 0), MAX_TIMEOUT_MS),
    );
  }

  const replay = await bus.eventsSince(socket.userId, message.lastEventId);

  send(socket, JSON.stringify({
    type: 'ready',
    data: { userId: socket.userId, resync: !replay.complete },
  }));
  for (const frame of replay.frames) send(socket, frame);
};

const subscribe = async (socket, topic) => {
  if (typeof topic !== 'string' || socket.topics.has(topic)) return;
  if (socket.topics.size >= MAX_TOPICS_PER_SOCKET) return;
  if (!(await topicAuthorizer(topic, socket.userId))) return;
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.topics.add(topic);
  addTo(topicSockets, topic, socket);
};

const unsubscribe = (socket, topic) => {
  if (!socket.topics.delete(topic)) return;
  removeFrom(topicSockets, topic, socket);
};

const handleMessage = async (socket, message) => {
  if (typeof message?.type !== 'string') return;

  if (message.type === 'subscribe') return subscribe(socket, message.topic);
  if (message.type === 'unsubscribe') return unsubscribe(socket, message.topic);

  const handler = messageHandlers.get(message.type);
  if (handler) await handler({ userId: socket.userId, userName: socket.userName }, message);
};

const onConnection = (socket) => {
  socket.userId = null;
  socket.userName = '';
  socket.isAlive = true;
  socket.topics = new Set();
  socket.queue = Promise.resolve();
  socket.rateStartedAt = Date.now();
  socket.rateCount = 0;

  socket.authTimer = setTimeout(
    () => socket.close(CLOSE.AUTH_TIMEOUT, 'Authentication timed out.'),
    AUTH_TIMEOUT_MS,
  );

  socket.on('pong', () => {
    socket.isAlive = true;
  });

  socket.on('message', (raw, isBinary) => {
    if (!withinRate(socket)) {
      socket.close(CLOSE.POLICY_VIOLATION, 'Too many messages.');
      return;
    }

    const message = parse(raw, isBinary);

    socket.queue = socket.queue
      .then(() => (socket.userId ? handleMessage(socket, message) : authenticate(socket, message)))
      .catch((error) => {
        console.error('WebSocket message failed:', error.message);
        if (!socket.userId) socket.close(CLOSE.UNAVAILABLE, 'Realtime is unavailable.');
      });
  });

  socket.on('close', () => {
    clearTimeout(socket.authTimer);
    clearTimeout(socket.expiryTimer);
    unregister(socket);
  });

  socket.on('error', logFailure('WebSocket error'));
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

export const attachRealtime = async (server, { allowedOrigins = [] } = {}) => {
  bus = await createBus();
  await bus.start(deliver);

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
  wss.on('close', () => {
    clearInterval(heartbeat);
    bus.close().catch(logFailure('Closing the realtime bus failed'));
  });

  return { wss, bus: bus.kind };
};

export const onClientMessage = (type, handler) => {
  messageHandlers.set(type, handler);
};

export const onPresenceChange = (listener) => {
  presenceListeners.push(listener);
};

export const setTopicAuthorizer = (authorize) => {
  topicAuthorizer = authorize;
};

export const isOnline = async (userId) => {
  if (!bus) return false;
  try {
    return await bus.isOnline(String(userId));
  } catch (error) {
    logFailure('Presence lookup failed')(error);
    return false;
  }
};

export const emitToUser = async (userId, type, data) => {
  if (!bus) return;
  const id = String(userId);

  try {
    if (!(await bus.isOnline(id))) return;
    const frame = await bus.appendEvent(id, type, data);
    await bus.publish({ kind: 'user', userId: id, frame });
  } catch (error) {
    logFailure(`Realtime ${type} failed`)(error);
  }
};

export const emitToUsers = async (userIds, type, data) => {
  const unique = [...new Set(userIds.map(String))];
  await Promise.all(unique.map((userId) => emitToUser(userId, type, data)));
};

export const sendEphemeral = async (userIds, type, data) => {
  if (!bus || userIds.length === 0) return;

  try {
    await bus.publish({
      kind: 'users',
      userIds: [...new Set(userIds.map(String))],
      frame: JSON.stringify({ type, data }),
    });
  } catch (error) {
    logFailure(`Realtime ${type} failed`)(error);
  }
};

export const emitToTopic = async (topic, type, data) => {
  if (!bus) return;

  try {
    await bus.publish({ kind: 'topic', topic, frame: JSON.stringify({ type, data }) });
  } catch (error) {
    logFailure(`Realtime ${type} failed`)(error);
  }
};

export const disconnectUser = async (userId, code, reason) => {
  if (!bus) return;

  try {
    await bus.publish({ kind: 'disconnect', userId: String(userId), code, reason });
  } catch (error) {
    logFailure('Realtime disconnect failed')(error);
  }
};
