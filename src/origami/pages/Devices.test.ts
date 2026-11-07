import { describe, expect, it } from 'vitest';
import { canBuyDevices } from './Devices';

const paid = {
  status: 'active',
  is_trial: false,
  device_limit: 5,
  requires_tariff_selection: false,
};

describe('canBuyDevices', () => {
  it('активная платная подписка с лимитом', () => {
    expect(canBuyDevices(paid)).toBe(true);
  });

  it('тест, безлимит, закончившаяся и старая без тарифа - нет', () => {
    expect(canBuyDevices({ ...paid, status: 'trial', is_trial: true })).toBe(false);
    expect(canBuyDevices({ ...paid, device_limit: 0 })).toBe(false);
    expect(canBuyDevices({ ...paid, status: 'expired' })).toBe(false);
    expect(canBuyDevices({ ...paid, requires_tariff_selection: true })).toBe(false);
  });
});
