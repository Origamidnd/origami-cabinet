/** Состав листа «Меню»: те же маршруты и условия показа, что у стоковой навигации. */
export interface MenuFlags {
  referralEnabled?: boolean;
  giftEnabled?: boolean;
  wheelEnabled?: boolean;
  hasContests?: boolean;
  hasPolls?: boolean;
}

export interface MenuItem {
  key: string;
  path: string;
  /** Ключ перевода из стоковых словарей (`nav.*`). */
  labelKey: string;
}

export function buildMenuItems(flags: MenuFlags): MenuItem[] {
  return [
    { key: 'subscription', path: '/subscriptions', labelKey: 'nav.subscription' },
    { key: 'balance', path: '/balance', labelKey: 'nav.balance' },
    ...(flags.referralEnabled
      ? [{ key: 'referral', path: '/referral', labelKey: 'nav.referral' }]
      : []),
    { key: 'support', path: '/support', labelKey: 'nav.support' },
    ...(flags.hasContests
      ? [{ key: 'contests', path: '/contests', labelKey: 'nav.contests' }]
      : []),
    ...(flags.hasPolls ? [{ key: 'polls', path: '/polls', labelKey: 'nav.polls' }] : []),
    ...(flags.wheelEnabled ? [{ key: 'wheel', path: '/wheel', labelKey: 'nav.wheel' }] : []),
    { key: 'info', path: '/info', labelKey: 'nav.info' },
    ...(flags.giftEnabled ? [{ key: 'gift', path: '/gift', labelKey: 'nav.gift' }] : []),
    { key: 'profile', path: '/profile', labelKey: 'nav.profile' },
  ];
}

/** Пункт активен на своём маршруте и на вложенных; «Подписка» ещё и на `/subscription/...`. */
export function isMenuItemActive(pathname: string, item: MenuItem): boolean {
  if (item.key === 'subscription') return pathname.startsWith('/subscription');
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

/** Экраны с узкой колонкой по центру: шапка выравнивается по ней, а не по широкому содержимому. */
export function isNarrowRoute(pathname: string): boolean {
  return pathname === '/' || pathname === '/add-device';
}
