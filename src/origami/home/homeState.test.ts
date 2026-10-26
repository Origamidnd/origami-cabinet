import { describe, expect, it } from 'vitest';
import type { Subscription } from '@/types';
import { type HomeStateInput, resolveHomeState } from './homeState';

function sub(patch: Partial<Subscription> = {}): Subscription {
  return {
    id: 1,
    status: 'active',
    is_trial: false,
    start_date: '2026-10-01T00:00:00',
    end_date: '2026-12-01T00:00:00',
    days_left: 40,
    hours_left: 960,
    minutes_left: 57600,
    time_left_display: '40 d',
    traffic_limit_gb: 500,
    traffic_used_gb: 0,
    traffic_used_percent: 0,
    device_limit: 5,
    connected_squads: [],
    servers: [],
    autopay_enabled: false,
    autopay_days_before: 3,
    subscription_url: 'https://example.test/sub/abc',
    hide_subscription_link: false,
    is_active: true,
    is_expired: false,
    is_limited: false,
    ...patch,
  };
}

function input(patch: Partial<HomeStateInput> = {}): HomeStateInput {
  return {
    multiTariff: false,
    subscriptionLoading: false,
    subscription: sub(),
    devicesLoading: false,
    devicesTotal: 0,
    wizardDismissed: false,
    ...patch,
  };
}

describe('resolveHomeState', () => {
  describe('активная подписка', () => {
    it('нет устройств и нет трафика -> мастер', () => {
      expect(resolveHomeState(input())).toBe('wizard');
    });

    it('тест (is_trial) без устройств и трафика -> мастер', () => {
      expect(
        resolveHomeState(input({ subscription: sub({ is_trial: true, status: 'trial' }) })),
      ).toBe('wizard');
    });

    it('есть устройства -> обычная сводка', () => {
      expect(resolveHomeState(input({ devicesTotal: 1 }))).toBe('summary');
      expect(resolveHomeState(input({ devicesTotal: 5 }))).toBe('summary');
    });

    it('устройств нет, но трафик уже был (клиент без HWID) -> сводка', () => {
      expect(
        resolveHomeState(input({ subscription: sub({ traffic_used_gb: 0.4 }), devicesTotal: 0 })),
      ).toBe('summary');
    });

    it('совсем малый трафик тоже считается трафиком', () => {
      expect(resolveHomeState(input({ subscription: sub({ traffic_used_gb: 0.0004 }) }))).toBe(
        'summary',
      );
    });

    it('«Я уже всё настроил(а)» отключает мастер на главной', () => {
      expect(resolveHomeState(input({ wizardDismissed: true }))).toBe('summary');
    });

    it('флаг отказа не влияет на другие состояния', () => {
      expect(
        resolveHomeState(input({ wizardDismissed: true, subscription: sub({ is_expired: true }) })),
      ).toBe('renew');
    });
  });

  describe('подписка закончилась', () => {
    it('просрочена -> продление, даже без устройств', () => {
      expect(
        resolveHomeState(
          input({ subscription: sub({ is_expired: true, is_active: false, status: 'expired' }) }),
        ),
      ).toBe('renew');
    });

    it('просрочена, устройства есть -> продление', () => {
      expect(
        resolveHomeState(input({ subscription: sub({ is_expired: true }), devicesTotal: 3 })),
      ).toBe('renew');
    });

    it('просрочена, но число устройств ещё грузится -> продление (мастеру устройства не нужны)', () => {
      expect(
        resolveHomeState(input({ subscription: sub({ is_expired: true }), devicesLoading: true })),
      ).toBe('renew');
    });
  });

  describe('остальное как в стоке', () => {
    it('нет подписки -> сток (триал и покупка)', () => {
      expect(resolveHomeState(input({ subscription: null }))).toBe('stock');
    });

    it('нужен выбор тарифа -> сток', () => {
      expect(
        resolveHomeState(input({ subscription: sub({ requires_tariff_selection: true }) })),
      ).toBe('stock');
    });

    it('выбор тарифа сильнее просрочки', () => {
      expect(
        resolveHomeState(
          input({ subscription: sub({ requires_tariff_selection: true, is_expired: true }) }),
        ),
      ).toBe('stock');
    });

    it('суточный тариф на паузе -> сток', () => {
      expect(
        resolveHomeState(input({ subscription: sub({ is_daily: true, is_daily_paused: true }) })),
      ).toBe('stock');
    });

    it('исчерпан лимит трафика -> сток', () => {
      expect(resolveHomeState(input({ subscription: sub({ is_limited: true }) }))).toBe('stock');
    });

    it('подписка отключена -> сток', () => {
      expect(resolveHomeState(input({ subscription: sub({ status: 'disabled' }) }))).toBe('stock');
    });

    it('подписка не активна и не просрочена (ожидание) -> сток', () => {
      expect(
        resolveHomeState(input({ subscription: sub({ is_active: false, status: 'pending' }) })),
      ).toBe('stock');
    });

    it('мультитариф -> сток при любых данных', () => {
      expect(resolveHomeState(input({ multiTariff: true }))).toBe('stock');
      expect(resolveHomeState(input({ multiTariff: true, subscription: null }))).toBe('stock');
    });
  });

  describe('загрузка и сбои', () => {
    it('подписка грузится -> loading', () => {
      expect(resolveHomeState(input({ subscriptionLoading: true, subscription: null }))).toBe(
        'loading',
      );
    });

    it('устройства грузятся у рабочей подписки -> loading, а не мигающий мастер', () => {
      expect(resolveHomeState(input({ devicesLoading: true }))).toBe('loading');
    });

    it('запрос устройств упал -> сводка, мастер не навязываем', () => {
      expect(resolveHomeState(input({ devicesTotal: null }))).toBe('summary');
    });

    it('мультитариф не ждёт загрузки подписки', () => {
      expect(resolveHomeState(input({ multiTariff: true, subscriptionLoading: true }))).toBe(
        'stock',
      );
    });
  });
});
