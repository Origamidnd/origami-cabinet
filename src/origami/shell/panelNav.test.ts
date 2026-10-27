import { describe, expect, it } from 'vitest';
import {
  buildBottomItems,
  buildMoreItems,
  buildSidebarPrimary,
  buildSidebarSecondary,
  isPanelItemActive,
} from './panelNav';

const keys = (items: { key: string }[]) => items.map((i) => i.key);

describe('боковая колонка', () => {
  it('основная группа без флагов: обзор, подписка, устройства, баланс, поддержка, информация', () => {
    expect(keys(buildSidebarPrimary({}))).toEqual([
      'overview',
      'subscription',
      'devices',
      'balance',
      'support',
      'info',
    ]);
  });

  it('рефералы появляются по флагу и стоят после баланса', () => {
    expect(keys(buildSidebarPrimary({ referralEnabled: true }))).toEqual([
      'overview',
      'subscription',
      'devices',
      'balance',
      'referral',
      'support',
      'info',
    ]);
  });

  it('вторая группа: подарки, колесо, конкурсы, опросы по флагам и всегда профиль', () => {
    expect(keys(buildSidebarSecondary({}))).toEqual(['profile']);
    expect(
      keys(
        buildSidebarSecondary({
          giftEnabled: true,
          wheelEnabled: true,
          hasContests: true,
          hasPolls: true,
        }),
      ),
    ).toEqual(['gift', 'wheel', 'contests', 'polls', 'profile']);
  });
});

describe('нижняя панель и «Ещё»', () => {
  it('в панели четыре пункта, поддержка подписана «Помощь»', () => {
    const items = buildBottomItems({});
    expect(keys(items)).toEqual(['overview', 'devices', 'balance', 'support']);
    expect(items[3].labelKey).toBe('origami.panel.help');
  });

  it('«Ещё» содержит остальное и не повторяет нижнюю панель', () => {
    const more = keys(
      buildMoreItems({ referralEnabled: true, giftEnabled: true, wheelEnabled: true }),
    );
    expect(more).toEqual(['subscription', 'referral', 'info', 'gift', 'wheel', 'profile']);
    expect(more).not.toContain('balance');
    expect(more).not.toContain('support');
  });

  it('«Ещё» без флагов: подписка, информация, профиль', () => {
    expect(keys(buildMoreItems({}))).toEqual(['subscription', 'info', 'profile']);
  });

  it('пункты «Ещё» не несут лишних полей иконки', () => {
    expect(Object.keys(buildMoreItems({})[0]).sort()).toEqual(['key', 'labelKey', 'path']);
  });
});

describe('isPanelItemActive', () => {
  const [overview, , devices, balance] = buildSidebarPrimary({});
  it('обзор активен только на главной', () => {
    expect(isPanelItemActive('/', overview)).toBe(true);
    expect(isPanelItemActive('/balance', overview)).toBe(false);
  });
  it('устройства активны на шторе, баланс на вложенных', () => {
    expect(isPanelItemActive('/add-device', devices)).toBe(true);
    expect(isPanelItemActive('/balance/top-up', balance)).toBe(true);
    expect(isPanelItemActive('/support', balance)).toBe(false);
  });
});
