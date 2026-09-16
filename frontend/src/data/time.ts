/* ============================================================================
   Timestamps are generated relative to the moment the app loads, so the feed
   always reads "5m", "3h", "2d" instead of slowly rotting into "3 years ago".
   ========================================================================== */

import type { ISODate } from "./types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const ago = (ms: number): ISODate => new Date(Date.now() - ms).toISOString();

export const minutesAgo = (n: number): ISODate => ago(n * MINUTE);
export const hoursAgo = (n: number): ISODate => ago(n * HOUR);
export const daysAgo = (n: number): ISODate => ago(n * DAY);
export const monthsAgo = (n: number): ISODate => ago(n * 30 * DAY);
export const yearsAgo = (n: number): ISODate => ago(n * 365 * DAY);
