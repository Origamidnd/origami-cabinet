import { describe, expect, it } from 'vitest';
import {
  daysSince,
  longDate,
  relativeDaysAgo,
  trafficPercent,
  trafficPercentLabel,
} from './format';

const t = (limit: number, used: number, pct = 0) => ({
  traffic_limit_gb: limit,
  traffic_used_gb: used,
  traffic_used_percent: pct,
});

describe('trafficPercent', () => {
  it('берёт процент панели, а без него считает сам', () => {
    expect(trafficPercent(t(500, 187.4, 37.48))).toBe(37);
    expect(trafficPercent(t(500, 250))).toBe(50);
  });
  it('ограничивает 0..100 и отдаёт 0 при безлимите', () => {
    expect(trafficPercent(t(100, 250))).toBe(100);
    expect(trafficPercent(t(0, 10))).toBe(0);
    expect(trafficPercent(t(500, 0))).toBe(0);
  });
  it('подпись: процент или прочерк при безлимите', () => {
    expect(trafficPercentLabel(t(500, 0))).toBe('0%');
    expect(trafficPercentLabel(t(500, 187.4, 37))).toBe('37%');
    expect(trafficPercentLabel(t(0, 10))).toBe('-');
  });
});

describe('longDate', () => {
  it('пишет месяц словами', () => {
    expect(longDate('2026-12-04T12:00:00', 'ru')).toContain('декабря');
    expect(longDate('2026-12-04T12:00:00', 'en')).toContain('December');
  });
  it('пустое и битое значение дают пустую строку', () => {
    expect(longDate(null, 'ru')).toBe('');
    expect(longDate('not-a-date', 'ru')).toBe('');
  });
});

describe('daysSince и relativeDaysAgo', () => {
  const now = new Date('2026-10-25T12:00:00');
  it('считает целые сутки', () => {
    expect(daysSince('2026-10-23T12:00:00', now)).toBe(2);
    expect(daysSince('2026-10-25T08:00:00', now)).toBe(0);
    expect(daysSince(undefined, now)).toBeNull();
    expect(daysSince('junk', now)).toBeNull();
  });
  it('подпись «3 дня назад», «вчера» и «сегодня»', () => {
    expect(relativeDaysAgo(3, 'ru')).toContain('3');
    expect(relativeDaysAgo(1, 'ru')).toBe('вчера');
    expect(relativeDaysAgo(0, 'ru')).toBe('сегодня');
    expect(relativeDaysAgo(-3, 'ru')).toBe('сегодня');
  });
});
