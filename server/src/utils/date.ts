import { DateTime } from 'luxon';
import { config } from '../config/index.js';

const TZ = config.timezone;

export function nowIST(): DateTime {
  return DateTime.now().setZone(TZ);
}

export function todayIST(): string {
  return nowIST().toFormat('yyyy-MM-dd');
}

export function toIST(date: Date | string): DateTime {
  if (typeof date === 'string') {
    return DateTime.fromISO(date, { zone: TZ });
  }
  return DateTime.fromJSDate(date).setZone(TZ);
}

export function formatTime(dt: DateTime): string {
  return dt.toFormat('hh:mm a');
}

export function formatDate(dt: DateTime): string {
  return dt.toFormat('dd MMM yyyy');
}

export function formatDateTime(dt: DateTime): string {
  return dt.toFormat('dd MMM yyyy hh:mm a');
}

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToHuman(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function startOfDayIST(dateStr: string): DateTime {
  return DateTime.fromISO(dateStr, { zone: TZ }).startOf('day');
}

export function endOfDayIST(dateStr: string): DateTime {
  return DateTime.fromISO(dateStr, { zone: TZ }).endOf('day');
}
