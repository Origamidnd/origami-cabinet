import { describe, expect, it } from 'vitest';
import { ticketState } from './ticketState';

const base = {
  is_active: true,
  is_limited: false,
  is_trial: false,
  status: 'active',
  days_left: 40,
  hours_left: 960,
};

describe('ticketState', () => {
  it('активная подписка: дни, зелёная метка, без подсветки', () => {
    expect(ticketState(base)).toEqual({
      expired: false,
      urgent: false,
      amount: 40,
      unit: 'd',
      tagKey: 'origami.overview.active',
      tone: 'ok',
    });
  });

  it('три дня и меньше: подсветка', () => {
    expect(ticketState({ ...base, days_left: 3 }).urgent).toBe(true);
    expect(ticketState({ ...base, days_left: 4 }).urgent).toBe(false);
  });

  it('последние сутки: часы вместо нуля дней', () => {
    const s = ticketState({ ...base, days_left: 0, hours_left: 7 });
    expect(s).toMatchObject({ amount: 7, unit: 'h', urgent: true, expired: false });
  });

  it('закончилась: метка «Истекла», а у приостановленной своя', () => {
    const off = { ...base, is_active: false, days_left: 0, hours_left: 0 };
    expect(ticketState({ ...off, status: 'expired' })).toMatchObject({
      expired: true,
      urgent: false,
      tagKey: 'origami.renew.expiredNoDate',
      tone: 'warn',
    });
    expect(ticketState({ ...off, status: 'disabled' }).tagKey).toBe('subscription.pause.suspended');
  });

  it('исчерпан трафик: не «закончилась», но метка предупреждения', () => {
    const s = ticketState({ ...base, is_active: false, is_limited: true });
    expect(s).toMatchObject({
      expired: false,
      tagKey: 'subscription.trafficLimited',
      tone: 'warn',
    });
  });

  it('тест: своя метка', () => {
    expect(ticketState({ ...base, is_trial: true }).tagKey).toBe('origami.overview.trial');
  });
});
