export const EVENT_WINDOW_MS = 5 * 60_000;
export const MAX_EVENTS_PER_USER = 200;

export const INCOMPLETE = Object.freeze({ complete: false, frames: [] });

export const isEventId = (id) => typeof id === 'string' && /^\d+-\d+$/.test(id);

export const eventIdTime = (id) => Number(id.split('-')[0]);

export const compareEventIds = (a, b) => {
  const [aTime, aSeq] = a.split('-').map(Number);
  const [bTime, bSeq] = b.split('-').map(Number);
  return aTime - bTime || aSeq - bSeq;
};
