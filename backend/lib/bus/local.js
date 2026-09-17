import {
  compareEventIds,
  EVENT_WINDOW_MS,
  eventIdTime,
  INCOMPLETE,
  isEventId,
  MAX_EVENTS_PER_USER,
} from './events.js';

export const createLocalBus = () => {
  const startedAt = Date.now();
  const logs = new Map();
  const connections = new Map();
  let deliver = () => {};
  let lastTime = 0;
  let sequence = 0;

  const nextId = () => {
    const now = Date.now();
    if (now > lastTime) {
      lastTime = now;
      sequence = 0;
    } else {
      sequence += 1;
    }
    return `${lastTime}-${sequence}`;
  };

  const logOf = (userId) => {
    let log = logs.get(userId);
    if (!log) {
      log = { entries: [], trimmedTo: null, offlineAt: 0 };
      logs.set(userId, log);
    }
    return log;
  };

  const trim = (log) => {
    const cutoff = Date.now() - EVENT_WINDOW_MS;
    while (
      log.entries.length > MAX_EVENTS_PER_USER ||
      (log.entries.length > 0 && eventIdTime(log.entries[0].id) < cutoff)
    ) {
      log.trimmedTo = log.entries.shift().id;
    }
  };

  const sweep = setInterval(() => {
    const cutoff = Date.now() - EVENT_WINDOW_MS;
    for (const [userId, log] of logs) {
      trim(log);
      if (log.entries.length === 0 && log.offlineAt < cutoff) logs.delete(userId);
    }
  }, 60_000);
  sweep.unref();

  return {
    kind: 'in-memory',

    async start(handler) {
      deliver = handler;
    },

    async publish(message) {
      deliver(message);
    },

    async appendEvent(userId, type, data) {
      const id = nextId();
      const frame = JSON.stringify({ type, id, data });
      const log = logOf(userId);
      log.entries.push({ id, frame });
      trim(log);
      return frame;
    },

    async eventsSince(userId, lastEventId) {
      if (!isEventId(lastEventId)) return INCOMPLETE;
      if (eventIdTime(lastEventId) < Math.max(startedAt, Date.now() - EVENT_WINDOW_MS)) {
        return INCOMPLETE;
      }

      const log = logs.get(userId);
      if (!log) return { complete: true, frames: [] };
      if (log.offlineAt && eventIdTime(lastEventId) < log.offlineAt) return INCOMPLETE;
      if (log.trimmedTo && compareEventIds(lastEventId, log.trimmedTo) < 0) return INCOMPLETE;

      return {
        complete: true,
        frames: log.entries
          .filter((entry) => compareEventIds(entry.id, lastEventId) > 0)
          .map((entry) => entry.frame),
      };
    },

    async presenceUp(userId) {
      const count = (connections.get(userId) ?? 0) + 1;
      connections.set(userId, count);
      return count === 1;
    },

    async presenceDown(userId) {
      const count = (connections.get(userId) ?? 0) - 1;
      if (count > 0) {
        connections.set(userId, count);
        return false;
      }

      connections.delete(userId);
      logOf(userId).offlineAt = Date.now();
      return true;
    },

    async isOnline(userId) {
      return connections.has(userId);
    },

    async close() {
      clearInterval(sweep);
    },
  };
};
