export type PipelineState = 'up' | 'degraded' | 'unknown';
export type StatusSource = 'live' | 'sample' | 'none';

export interface FilingBotStatus {
  state: PipelineState;
  filingsProcessed: number | null;
  lastFilingAt: Date | null;
  source: StatusSource;
}

const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export const UNKNOWN_STATUS: FilingBotStatus = {
  state: 'unknown',
  filingsProcessed: null,
  lastFilingAt: null,
  source: 'none',
};

function readState(value: unknown): PipelineState {
  return value === 'up' || value === 'degraded' ? value : 'unknown';
}

function readCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function readTimestamp(value: unknown, now: number): Date | null {
  if (typeof value !== 'string') return null;
  const time = Date.parse(value);
  if (Number.isNaN(time) || time > now + FUTURE_TOLERANCE_MS) return null;
  return new Date(time);
}

export function parseStatus(raw: unknown, source: StatusSource, now = Date.now()): FilingBotStatus {
  if (typeof raw !== 'object' || raw === null) return UNKNOWN_STATUS;
  const record = raw as Record<string, unknown>;
  return {
    state: readState(record.status),
    filingsProcessed: readCount(record.filings_processed),
    lastFilingAt: readTimestamp(record.last_filing_at, now),
    source,
  };
}

export async function fetchStatus(url: string, source: StatusSource, timeoutMs = 3000): Promise<FilingBotStatus> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' });
    if (!response.ok) return UNKNOWN_STATUS;
    return parseStatus(await response.json(), source);
  } catch {
    return UNKNOWN_STATUS;
  }
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const count = new Intl.NumberFormat('en');

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

export function formatSince(date: Date, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (seconds < 60) return 'under a minute ago';
  for (const [unit, size] of UNITS) {
    if (seconds >= size) return relative.format(-Math.floor(seconds / size), unit);
  }
  return 'under a minute ago';
}

export function formatCount(value: number): string {
  return count.format(value);
}
