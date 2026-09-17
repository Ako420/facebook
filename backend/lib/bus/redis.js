import { randomUUID } from 'node:crypto';
import { createClient } from 'redis';
import {
  compareEventIds,
  EVENT_WINDOW_MS,
  eventIdTime,
  INCOMPLETE,
  isEventId,
  MAX_EVENTS_PER_USER,
} from './events.js';

const CHANNEL = 'rt:bus';
const INSTANCE_TTL_S = 60;
const INSTANCE_REFRESH_MS = 20_000;

const logKey = (userId) => `rt:log:${userId}`;
const presenceKey = (userId) => `rt:presence:${userId}`;
const offlineKey = (userId) => `rt:offline:${userId}`;
const instanceKey = (instanceId) => `rt:instance:${instanceId}`;

const toObject = (reply) => {
  if (!reply) return {};
  if (reply instanceof Map) return Object.fromEntries(reply);
  if (!Array.isArray(reply)) return reply;

  const object = {};
  for (let i = 0; i < reply.length; i += 2) object[reply[i]] = reply[i + 1];
  return object;
};

const frameOf = (type, id, data) =>
  `{"type":${JSON.stringify(String(type))},"id":${JSON.stringify(String(id))},"data":${data}}`;

export const createRedisBus = async (url) => {
  const instanceId = randomUUID();
  const client = createClient({ url });
  const subscriber = client.duplicate();

  for (const connection of [client, subscriber]) {
    connection.on('error', (error) => console.error('Redis error:', error.message));
  }
  await Promise.all([client.connect(), subscriber.connect()]);

  const run = (...args) => client.sendCommand(args.map(String));

  const redisNow = async () => {
    const [seconds, micros] = await run('TIME');
    return Number(seconds) * 1000 + Math.floor(Number(micros) / 1000);
  };

  const heartbeat = () => run('SET', instanceKey(instanceId), '1', 'EX', INSTANCE_TTL_S);
  await heartbeat();

  const refresh = setInterval(() => {
    heartbeat().catch((error) => console.error('Redis heartbeat failed:', error.message));
  }, INSTANCE_REFRESH_MS);
  refresh.unref();

  const connectionCount = async (userId) => {
    const counts = toObject(await run('HGETALL', presenceKey(userId)));
    let total = 0;

    for (const [instance, value] of Object.entries(counts)) {
      if (Number(value) <= 0) continue;

      if (Number(await run('EXISTS', instanceKey(instance)))) {
        total += Number(value);
      } else {
        await run('HDEL', presenceKey(userId), instance);
      }
    }

    return total;
  };

  const quit = (connection) => (connection.close ?? connection.quit).call(connection);

  return {
    kind: 'redis',

    async start(handler) {
      await subscriber.subscribe(CHANNEL, (raw) => {
        let message;
        try {
          message = JSON.parse(raw);
        } catch {
          return;
        }
        handler(message);
      });
    },

    async publish(message) {
      await client.publish(CHANNEL, JSON.stringify(message));
    },

    async appendEvent(userId, type, data) {
      const payload = JSON.stringify(data);
      const id = await run(
        'XADD', logKey(userId), 'MAXLEN', '~', MAX_EVENTS_PER_USER, '*', 't', type, 'd', payload,
      );
      await run('PEXPIRE', logKey(userId), EVENT_WINDOW_MS);
      return frameOf(type, id, payload);
    },

    async eventsSince(userId, lastEventId) {
      if (!isEventId(lastEventId)) return INCOMPLETE;

      const now = await redisNow();
      if (eventIdTime(lastEventId) < now - EVENT_WINDOW_MS) return INCOMPLETE;

      const offlineAt = Number(await run('GET', offlineKey(userId)));
      if (offlineAt && eventIdTime(lastEventId) < offlineAt) return INCOMPLETE;

      let info;
      try {
        info = toObject(await run('XINFO', 'STREAM', logKey(userId)));
      } catch {
        return INCOMPLETE;
      }

      const trimmedTo = info['max-deleted-entry-id'];
      if (isEventId(trimmedTo) && trimmedTo !== '0-0' && compareEventIds(lastEventId, trimmedTo) < 0) {
        return INCOMPLETE;
      }

      const entries = await run('XRANGE', logKey(userId), `(${lastEventId}`, '+');
      return {
        complete: true,
        frames: entries.map(([id, fields]) => {
          const entry = toObject(fields);
          return frameOf(entry.t, id, entry.d);
        }),
      };
    },

    async presenceUp(userId) {
      await run('HINCRBY', presenceKey(userId), instanceId, 1);
      return (await connectionCount(userId)) === 1;
    },

    async presenceDown(userId) {
      const left = Number(await run('HINCRBY', presenceKey(userId), instanceId, -1));
      if (left <= 0) await run('HDEL', presenceKey(userId), instanceId);

      if ((await connectionCount(userId)) > 0) return false;

      await run('SET', offlineKey(userId), await redisNow(), 'PX', EVENT_WINDOW_MS);
      return true;
    },

    async isOnline(userId) {
      return (await connectionCount(userId)) > 0;
    },

    async close() {
      clearInterval(refresh);
      await run('DEL', instanceKey(instanceId)).catch(() => undefined);
      await Promise.allSettled([quit(subscriber), quit(client)]);
    },
  };
};
