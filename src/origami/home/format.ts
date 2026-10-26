import type { Subscription } from '@/types';

/** Доля израсходованного трафика в процентах; 0 при безлимите. */
export function trafficPercent(
  s: Pick<Subscription, 'traffic_limit_gb' | 'traffic_used_gb' | 'traffic_used_percent'>,
): number {
  if (!(s.traffic_limit_gb > 0)) return 0;
  const raw =
    s.traffic_used_percent > 0
      ? s.traffic_used_percent
      : (s.traffic_used_gb / s.traffic_limit_gb) * 100;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/** Подпись процента для полосы сводки: «37%», а при безлимите прочерк. */
export function trafficPercentLabel(s: Parameters<typeof trafficPercent>[0]): string {
  return s.traffic_limit_gb > 0 ? `${trafficPercent(s)}%` : '-';
}

/** Дата словами на языке интерфейса: «4 декабря 2026 г.». Пустая строка, если даты нет или она битая. */
export function longDate(value: string | null | undefined, lang: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Сколько целых суток прошло с даты; отрицательное, если дата в будущем. */
export function daysSince(value: string | null | undefined, now: Date = new Date()): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((now.getTime() - date.getTime()) / 86_400_000);
}

/** «2 дня назад», «вчера», «сегодня» на языке интерфейса. */
export function relativeDaysAgo(days: number, lang: string): string {
  const safe = Math.max(0, days);
  try {
    return new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }).format(
      safe === 0 ? 0 : -safe,
      'day',
    );
  } catch {
    return `${safe} d`;
  }
}
