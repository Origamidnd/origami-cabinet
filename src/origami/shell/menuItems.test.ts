import { describe, expect, it } from 'vitest';
import { buildMenuItems, isMenuItemActive, isNarrowRoute } from './menuItems';

const keys = (flags: Parameters<typeof buildMenuItems>[0]) =>
  buildMenuItems(flags).map((i) => i.key);

describe('buildMenuItems', () => {
  it('без флагов: подписка, баланс, поддержка, информация, профиль', () => {
    expect(keys({})).toEqual(['subscription', 'balance', 'support', 'info', 'profile']);
  });

  it('рефералы и подарки появляются только по флагам, на своих местах', () => {
    expect(keys({ referralEnabled: true, giftEnabled: true })).toEqual([
      'subscription',
      'balance',
      'referral',
      'support',
      'info',
      'gift',
      'profile',
    ]);
  });

  it('конкурсы, опросы и колесо учитываются независимо', () => {
    expect(keys({ hasContests: true })).toContain('contests');
    expect(keys({ hasPolls: true })).toContain('polls');
    expect(keys({ wheelEnabled: true })).toContain('wheel');
    expect(keys({})).not.toContain('wheel');
  });

  it('маршруты те же, что у стоковой навигации', () => {
    const paths = Object.fromEntries(
      buildMenuItems({ referralEnabled: true, giftEnabled: true }).map((i) => [i.key, i.path]),
    );
    expect(paths).toMatchObject({
      subscription: '/subscriptions',
      balance: '/balance',
      referral: '/referral',
      support: '/support',
      info: '/info',
      gift: '/gift',
      profile: '/profile',
    });
  });
});

describe('isMenuItemActive', () => {
  const items = Object.fromEntries(buildMenuItems({}).map((i) => [i.key, i]));

  it('подписка активна на списке, карточке и покупке', () => {
    expect(isMenuItemActive('/subscriptions', items.subscription)).toBe(true);
    expect(isMenuItemActive('/subscriptions/3/renew', items.subscription)).toBe(true);
    expect(isMenuItemActive('/subscription/purchase', items.subscription)).toBe(true);
  });

  it('баланс активен на вложенных страницах пополнения', () => {
    expect(isMenuItemActive('/balance/top-up/sbp', items.balance)).toBe(true);
    expect(isMenuItemActive('/support', items.balance)).toBe(false);
  });

  it('пункт не путается с похожим префиксом', () => {
    expect(isMenuItemActive('/information', items.info)).toBe(false);
    expect(isMenuItemActive('/info/faq', items.info)).toBe(true);
  });
});

describe('isNarrowRoute', () => {
  it('главная и добавление устройства узкие, остальные нет', () => {
    expect(isNarrowRoute('/')).toBe(true);
    expect(isNarrowRoute('/add-device')).toBe(true);
    expect(isNarrowRoute('/balance')).toBe(false);
    expect(isNarrowRoute('/admin')).toBe(false);
  });
});
