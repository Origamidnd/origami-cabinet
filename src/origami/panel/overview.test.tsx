// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Subscription } from '@/types';
import OverviewWidgets, { type OverviewProps } from './OverviewWidgets';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

afterEach(cleanup);

const sub = (patch: Partial<Subscription> = {}): Subscription => ({
  id: 7,
  status: 'active',
  is_trial: false,
  start_date: '2026-10-01T00:00:00',
  end_date: '2026-12-04T12:00:00',
  days_left: 40,
  hours_left: 960,
  minutes_left: 57600,
  time_left_display: '40 d',
  traffic_limit_gb: 500,
  traffic_used_gb: 187.4,
  traffic_used_percent: 37,
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
  tariff_name: 'Стандарт',
  ...patch,
});

const devices = {
  devices: [
    { hwid: 'a', platform: 'iOS', device_model: 'iPhone 15', created_at: '2026-10-25T10:00:00' },
    { hwid: 'b', platform: 'Windows', device_model: 'ThinkPad', created_at: null },
  ],
  total: 2,
  device_limit: 5,
};

function view(patch: Partial<OverviewProps> = {}) {
  const props: OverviewProps = {
    state: 'summary',
    name: 'Алиса',
    lang: 'ru',
    subscription: sub(),
    devices,
    balanceText: '1 250,00 ₽',
    referral: { total: 7, active: 4, earnedText: '840,00 ₽', percent: 25 },
    onConnect: vi.fn(),
    onDismiss: vi.fn(),
    ...patch,
  };
  render(
    <MemoryRouter>
      <OverviewWidgets {...props} />
    </MemoryRouter>,
  );
  return props;
}

describe('обзор: активная подписка с устройствами', () => {
  it('показывает все виджеты и не показывает блок подключения', () => {
    view();
    for (const id of [
      'widget-subscription',
      'widget-traffic',
      'widget-devices',
      'widget-balance',
      'widget-my-devices',
      'widget-friends',
    ]) {
      expect(screen.getByTestId(id)).toBeTruthy();
    }
    expect(screen.queryByTestId('connect-banner')).toBeNull();
    expect(screen.getByTestId('widget-devices').className).not.toContain('og-w-hot');
  });

  it('виджета серверов нет', () => {
    view();
    expect(document.querySelector('[data-testid="widget-servers"]')).toBeNull();
  });

  it('подписка: дни, тариф и кнопка продления ведут на продление этой подписки', () => {
    view();
    const widget = screen.getByTestId('widget-subscription');
    expect(widget.textContent).toContain('40');
    expect(widget.textContent).toContain('Стандарт');
    expect(widget.querySelector('a')?.getAttribute('href')).toBe('/subscriptions/7/renew');
  });

  it('трафик: использовано и лимит, полоса по проценту', () => {
    view();
    const widget = screen.getByTestId('widget-traffic');
    expect(widget.textContent).toContain('187.4');
    expect(widget.textContent).toContain('500');
    expect((widget.querySelector('.og-meter > i') as HTMLElement).style.width).toBe('37%');
  });

  it('без лимита трафика полосы нет', () => {
    view({ subscription: sub({ traffic_limit_gb: 0 }) });
    expect(screen.getByTestId('widget-traffic').querySelector('.og-meter')).toBeNull();
  });

  it('устройства: число и кнопка «Подключить» открывает подключение', () => {
    const props = view();
    const widget = screen.getByTestId('widget-devices');
    expect(widget.textContent).toContain('2');
    fireEvent.click(widget.querySelector('button') as HTMLElement);
    expect(props.onConnect).toHaveBeenCalledTimes(1);
  });

  it('баланс: сумма и «Пополнить» ведёт на пополнение', () => {
    view();
    const widget = screen.getByTestId('widget-balance');
    expect(widget.textContent).toContain('1 250,00 ₽');
    expect(widget.querySelector('a')?.getAttribute('href')).toBe('/balance/top-up');
  });

  it('мои устройства: буквы в квадратах и ссылка «Все»', () => {
    view();
    const widget = screen.getByTestId('widget-my-devices');
    expect([...widget.querySelectorAll('.og-dev-ico')].map((n) => n.textContent)).toEqual([
      'I',
      'T',
    ]);
    expect(widget.querySelector('a')?.getAttribute('href')).toBe('/subscriptions');
  });

  it('друзья скрыты, если реферальная программа выключена', () => {
    view({ referral: null });
    expect(screen.queryByTestId('widget-friends')).toBeNull();
  });
});

describe('обзор: нет устройств и трафика (автоопределение)', () => {
  it('над виджетами блок «Давайте подключим VPN», виджет устройств подсвечен', () => {
    const props = view({
      state: 'wizard',
      devices: { devices: [], total: 0, device_limit: 5 },
      subscription: sub({ traffic_used_gb: 0, traffic_used_percent: 0 }),
    });
    expect(screen.getByTestId('connect-banner')).toBeTruthy();
    expect(screen.getByTestId('widget-devices').className).toContain('og-w-hot');
    fireEvent.click(screen.getByText('origami.overview.connect.button'));
    expect(props.onConnect).toHaveBeenCalledTimes(1);
  });

  it('«Я уже всё настроил(а)» зовёт отказ', () => {
    const props = view({ state: 'wizard', devices: { devices: [], total: 0, device_limit: 5 } });
    fireEvent.click(screen.getByText('origami.wizard.dismiss'));
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('обзор: подписка закончилась', () => {
  it('виджет в состоянии «Закончилась», кнопка продления и «Сменить тариф», блока подключения нет', () => {
    view({
      state: 'renew',
      subscription: sub({ is_expired: true, is_active: false, days_left: 0 }),
    });
    const widget = screen.getByTestId('widget-subscription');
    expect(widget.textContent).toContain('origami.overview.expiredTitle');
    expect(widget.querySelector('.og-tag-warn')).not.toBeNull();
    const hrefs = [...widget.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/subscriptions/7/renew', '/subscription/purchase']);
    expect(screen.queryByTestId('connect-banner')).toBeNull();
  });
});

describe('обзор: блок помощи', () => {
  it('всегда есть и ведёт в поддержку', () => {
    view();
    expect(screen.getByTestId('og-help').querySelector('a')?.getAttribute('href')).toBe('/support');
  });
});

describe('обзор: серверы и график трафика со страницы подписки', () => {
  const extras = {
    servers: [
      { name: '🇸🇪 Швеция', online: false, pingMs: null },
      { name: '🇩🇪 Германия', online: true, pingMs: 37 },
      { name: '🇫🇮 Финляндия', online: true, pingMs: 12 },
    ],
    traffic: [0, 5, 3, 9, 2, 0, 4, 7, 1, 6, 8, 2, 3, 5],
  };

  it('виджет «Серверы»: сначала в сети по пингу, без связи в конце; ряд из трёх', () => {
    view({ extras });
    const widget = screen.getByTestId('widget-servers');
    const rows = [...widget.querySelectorAll('li')].map((li) => li.textContent);
    expect(rows).toEqual([
      '🇫🇮 Финляндияorigami.overview.pingMs',
      '🇩🇪 Германияorigami.overview.pingMs',
      '🇸🇪 Швецияorigami.overview.serverOff',
    ]);
    expect(widget.parentElement?.className).toBe('og-grid3');
  });

  it('серверов больше шести - видно шесть и кнопка «Показать все», по ней все и «Свернуть»', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({
      name: `S${i}`,
      online: true,
      pingMs: null,
    }));
    view({ extras: { servers: many, traffic: extras.traffic } });
    const widget = screen.getByTestId('widget-servers');
    expect(widget.querySelectorAll('li')).toHaveLength(6);
    const toggle = screen.getByTestId('servers-toggle');
    expect(toggle.textContent).toBe('origami.overview.serversAll');
    fireEvent.click(toggle);
    expect(widget.querySelectorAll('li')).toHaveLength(9);
    expect(screen.getByTestId('servers-toggle').textContent).toBe('origami.overview.serversLess');
  });

  it('шесть и меньше - без кнопки', () => {
    view({ extras });
    expect(screen.queryByTestId('servers-toggle')).toBeNull();
  });

  it('график трафика рисуется в виджете «Трафик»', () => {
    view({ extras });
    expect(
      screen.getByTestId('widget-traffic').querySelector('[data-testid="traffic-spark"]'),
    ).toBeTruthy();
  });

  it('без друзей - ряд из двух; пустые данные - ни виджета, ни графика', () => {
    view({ extras, referral: null });
    expect(screen.getByTestId('widget-servers').parentElement?.className.trim()).toBe('og-grid2');
    cleanup();
    view({ extras: { servers: [], traffic: [0, 0] } });
    expect(document.querySelector('[data-testid="widget-servers"]')).toBeNull();
    expect(document.querySelector('[data-testid="traffic-spark"]')).toBeNull();
  });
});
