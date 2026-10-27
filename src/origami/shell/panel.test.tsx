// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PanelBottomNav, { type PanelBottomNavProps } from './PanelBottomNav';
import PanelSidebar, { type PanelSidebarProps } from './PanelSidebar';
import { buildBottomItems, buildSidebarPrimary, buildSidebarSecondary } from './panelNav';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

afterEach(cleanup);

function sidebar(patch: Partial<PanelSidebarProps> = {}, flags = {}) {
  const props: PanelSidebarProps = {
    pathname: '/',
    appName: 'OrigamiVPN',
    logoLetter: 'O',
    logoUrl: null,
    hasCustomLogo: false,
    primary: buildSidebarPrimary(flags),
    secondary: buildSidebarSecondary(flags),
    isAdmin: false,
    balanceText: '1 250,00 ₽',
    canToggleTheme: true,
    isDark: false,
    onToggleTheme: vi.fn(),
    canLogout: true,
    onLogout: vi.fn(),
    notifications: <span data-testid="bell" />,
    ...patch,
  };
  render(
    <MemoryRouter>
      <PanelSidebar {...props} />
    </MemoryRouter>,
  );
  return props;
}

function bottom(patch: Partial<PanelBottomNavProps> = {}) {
  const props: PanelBottomNavProps = {
    pathname: '/',
    items: buildBottomItems({}),
    moreOpen: false,
    onToggleMore: vi.fn(),
    moreId: 'more',
    ...patch,
  };
  render(
    <MemoryRouter>
      <PanelBottomNav {...props} />
    </MemoryRouter>,
  );
  return props;
}

describe('боковая колонка панели', () => {
  it('разделы по порядку, текущий помечен', () => {
    sidebar({ pathname: '/balance' });
    const keys = screen.getAllByRole('link').map((a) => a.getAttribute('data-key'));
    expect(keys.filter(Boolean)).toEqual([
      'overview',
      'subscription',
      'devices',
      'balance',
      'support',
      'info',
      'profile',
    ]);
    expect(document.querySelector('[aria-current="page"]')?.getAttribute('data-key')).toBe(
      'balance',
    );
  });

  it('рефералы и подарки только по флагам', () => {
    sidebar({}, { referralEnabled: true, giftEnabled: true });
    const keys = screen.getAllByRole('link').map((a) => a.getAttribute('data-key'));
    expect(keys).toContain('referral');
    expect(keys).toContain('gift');
  });

  it('внизу баланс, «Пополнить» ведёт на пополнение, есть уведомления и выход', () => {
    const props = sidebar();
    expect(screen.getByText('1 250,00 ₽')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'origami.panel.topup' }).getAttribute('href')).toBe(
      '/balance/top-up',
    );
    expect(screen.getByTestId('bell')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'nav.logout' }));
    expect(props.onLogout).toHaveBeenCalledTimes(1);
  });

  it('в Telegram выхода нет, ссылка в админку только у админа', () => {
    sidebar({ canLogout: false, isAdmin: true });
    expect(screen.queryByRole('button', { name: 'nav.logout' })).toBeNull();
    expect(document.querySelector('[data-key="admin"]')).not.toBeNull();
    cleanup();
    sidebar({ isAdmin: false });
    expect(document.querySelector('[data-key="admin"]')).toBeNull();
  });

  it('«Тема» зовёт переключатель и скрывается, если тема одна', () => {
    const props = sidebar();
    fireEvent.click(screen.getByText('origami.shell.theme'));
    expect(props.onToggleTheme).toHaveBeenCalledTimes(1);
    cleanup();
    sidebar({ canToggleTheme: false });
    expect(screen.queryByText('origami.shell.theme')).toBeNull();
  });
});

describe('нижняя панель', () => {
  it('четыре раздела и «Ещё»', () => {
    bottom();
    const keys = [...document.querySelectorAll('.og-bnav-item')].map((n) =>
      n.getAttribute('data-key'),
    );
    expect(keys).toEqual(['overview', 'devices', 'balance', 'support', 'more']);
  });

  it('«Ещё» меняет aria-expanded и зовёт переключатель', () => {
    const props = bottom({ moreOpen: true });
    const more = document.querySelector('[data-key="more"]') as HTMLElement;
    expect(more.getAttribute('aria-expanded')).toBe('true');
    expect(more.getAttribute('aria-controls')).toBe('more');
    fireEvent.click(more);
    expect(props.onToggleMore).toHaveBeenCalledTimes(1);
  });

  it('при открытом «Ещё» активен он, а не раздел под ним', () => {
    bottom({ moreOpen: true, pathname: '/' });
    expect(
      document.querySelector('[data-key="overview"]')?.getAttribute('aria-current'),
    ).toBeNull();
  });
});
