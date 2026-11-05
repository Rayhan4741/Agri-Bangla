/** Date helpers in Bangladesh time (UTC+6, no DST). */
export function bdToday(d = new Date()): string {
  return new Date(d.getTime() + 6 * 3600_000).toISOString().slice(0, 10);
}
export function bdHour(d = new Date()): number {
  return new Date(d.getTime() + 6 * 3600_000).getUTCHours();
}
export function addDays(iso: string, days: number): string {
  const t = new Date(`${iso}T00:00:00Z`).getTime() + days * 86400_000;
  return new Date(t).toISOString().slice(0, 10);
}
const SEASONS: [number[], string][] = [
  [[11, 12, 1, 2], 'রবি মৌসুম (শীতকাল)'],
  [[3, 4, 5, 6], 'খরিফ-১ মৌসুম (গ্রীষ্ম)'],
  [[7, 8, 9, 10], 'খরিফ-২ মৌসুম (বর্ষা/আমন)'],
];
export function cropSeasonBn(month: number) {
  return SEASONS.find(([m]) => m.includes(month))?.[1] ?? '';
}
