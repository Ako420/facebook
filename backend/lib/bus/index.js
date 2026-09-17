import { createLocalBus } from './local.js';
import { createRedisBus } from './redis.js';

export const createBus = () =>
  process.env.REDIS_URL ? createRedisBus(process.env.REDIS_URL) : createLocalBus();
