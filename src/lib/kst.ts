const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function nowKst(): Date {
  return new Date(Date.now() + KST_OFFSET_MS);
}

export function toKstDateString(epochMs: number): string {
  const d = new Date(epochMs + KST_OFFSET_MS);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function kstSlotStartEpoch(date: string, hour: number): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d, hour, 0, 0) - KST_OFFSET_MS;
}

export function todayKst(): string {
  return toKstDateString(Date.now());
}

export function addDaysKst(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const epoch = Date.UTC(y, m - 1, d) + days * 86400000;
  return toKstDateString(epoch - KST_OFFSET_MS);
}
