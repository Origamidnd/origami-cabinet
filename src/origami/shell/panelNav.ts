import { buildMenuItems, type MenuFlags, type MenuItem } from './menuItems';

/**
 * Состав навигации панели. Условия показа те же, что у стоковой навигации (флаги рефералов, подарков,
 * колеса, конкурсов и опросов), поэтому секции собираются из `buildMenuItems`.
 */
export type PanelIcon =
  | 'home'
  | 'subscription'
  | 'devices'
  | 'wallet'
  | 'users'
  | 'chat'
  | 'info'
  | 'gift'
  | 'wheel'
  | 'contests'
  | 'polls'
  | 'user';

export interface PanelNavItem extends MenuItem {
  icon: PanelIcon;
}

const ICONS: Record<string, PanelIcon> = {
  subscription: 'subscription',
  balance: 'wallet',
  referral: 'users',
  support: 'chat',
  contests: 'contests',
  polls: 'polls',
  wheel: 'wheel',
  info: 'info',
  gift: 'gift',
  profile: 'user',
};

export const OVERVIEW: PanelNavItem = {
  key: 'overview',
  path: '/',
  labelKey: 'origami.panel.overview',
  icon: 'home',
};
export const DEVICES: PanelNavItem = {
  key: 'devices',
  path: '/add-device',
  labelKey: 'origami.panel.devices',
  icon: 'devices',
};
const HELP: PanelNavItem = {
  key: 'support',
  path: '/support',
  labelKey: 'origami.panel.help',
  icon: 'chat',
};

function pick(flags: MenuFlags, keys: string[]): PanelNavItem[] {
  const byKey = new Map(buildMenuItems(flags).map((i) => [i.key, i]));
  return keys.flatMap((key) => {
    const item = byKey.get(key);
    return item ? [{ ...item, icon: ICONS[key] ?? 'info' }] : [];
  });
}

/** Основная группа боковой колонки: Обзор, Подписка, Устройства, Баланс, Рефералы, Поддержка, Информация. */
export function buildSidebarPrimary(flags: MenuFlags): PanelNavItem[] {
  const [subscription, balance, referral, support, info] = [
    'subscription',
    'balance',
    'referral',
    'support',
    'info',
  ].map((key) => pick(flags, [key])[0]);
  return [OVERVIEW, subscription, DEVICES, balance, referral, support, info].filter(Boolean);
}

/** Остальные пункты боковой колонки (по флагам) и профиль. */
export function buildSidebarSecondary(flags: MenuFlags): PanelNavItem[] {
  return pick(flags, ['gift', 'wheel', 'contests', 'polls', 'profile']);
}

/** Нижняя панель на телефоне: четыре пункта, пятый «Ещё» - отдельная кнопка. */
export function buildBottomItems(flags: MenuFlags): PanelNavItem[] {
  const balance = pick(flags, ['balance'])[0];
  return [OVERVIEW, DEVICES, balance, HELP];
}

/** Содержимое листа «Ещё»: всё, чего нет в нижней панели. */
export function buildMoreItems(flags: MenuFlags): MenuItem[] {
  const keys = [
    'subscription',
    'referral',
    'info',
    'gift',
    'wheel',
    'contests',
    'polls',
    'profile',
  ];
  return pick(flags, keys).map(({ icon: _icon, ...item }) => item);
}

/** Активность пункта: «Обзор» только на `/`, «Устройства» на `/add-device`, «Подписка» на `/subscription...`. */
export function isPanelItemActive(pathname: string, item: PanelNavItem): boolean {
  if (item.path === '/') return pathname === '/';
  if (item.key === 'subscription') return pathname.startsWith('/subscription');
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}
