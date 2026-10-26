// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MenuSheet, { type MenuSheetProps } from './MenuSheet';
import OrigamiHeader, { type OrigamiHeaderProps } from './OrigamiHeader';
import { buildMenuItems } from './menuItems';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

afterEach(cleanup);

function header(patch: Partial<OrigamiHeaderProps> = {}) {
  const props: OrigamiHeaderProps = {
    appName: 'OrigamiVPN',
    logoLetter: 'O',
    logoUrl: null,
    hasCustomLogo: false,
    canToggleTheme: true,
    isDark: false,
    onToggleTheme: vi.fn(),
    menuOpen: false,
    onToggleMenu: vi.fn(),
    menuId: 'menu',
    ...patch,
  };
  render(
    <MemoryRouter>
      <OrigamiHeader {...props} />
    </MemoryRouter>,
  );
  return props;
}

function sheet(patch: Partial<MenuSheetProps> = {}) {
  const props: MenuSheetProps = {
    id: 'menu',
    open: true,
    onClose: vi.fn(),
    pathname: '/balance',
    items: buildMenuItems({ referralEnabled: true, giftEnabled: true }),
    isAdmin: false,
    userName: 'Алиса',
    userHandle: '@alisa',
    canLogout: true,
    onLogout: vi.fn(),
    top: '64px',
    notifications: <span data-testid="bell" />,
    ...patch,
  };
  render(
    <MemoryRouter>
      <MenuSheet {...props} />
    </MemoryRouter>,
  );
  return props;
}

describe('шапка оболочки 05', () => {
  it('логотип, «Тема» и «Меню», без вкладок', () => {
    header();
    expect(screen.getByText('OrigamiVPN')).toBeTruthy();
    expect(screen.getByText('origami.shell.theme')).toBeTruthy();
    expect(screen.getByText('origami.common.menu')).toBeTruthy();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('«Тема» не показывается, если включена одна тема', () => {
    header({ canToggleTheme: false });
    expect(screen.queryByText('origami.shell.theme')).toBeNull();
  });

  it('кнопки зовут свои обработчики', () => {
    const props = header();
    fireEvent.click(screen.getByText('origami.shell.theme'));
    fireEvent.click(screen.getByRole('button', { name: 'origami.shell.openMenu' }));
    expect(props.onToggleTheme).toHaveBeenCalledTimes(1);
    expect(props.onToggleMenu).toHaveBeenCalledTimes(1);
  });

  it('aria-expanded и подпись зависят от состояния', () => {
    header({ menuOpen: true });
    const button = screen.getByRole('button', { name: 'origami.shell.closeMenu' });
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-controls')).toBe('menu');
  });
});

describe('лист «Меню»', () => {
  it('показывает пункты по порядку, профиль и уведомления', () => {
    sheet();
    const links = screen.getAllByRole('link').map((a) => a.getAttribute('data-key'));
    expect(links).toEqual([
      'subscription',
      'balance',
      'referral',
      'support',
      'info',
      'gift',
      'profile',
    ]);
    expect(screen.getByTestId('bell')).toBeTruthy();
    expect(screen.getByText('Алиса')).toBeTruthy();
  });

  it('без флагов нет рефералов и подарков', () => {
    sheet({ items: buildMenuItems({}) });
    const links = screen.getAllByRole('link').map((a) => a.getAttribute('data-key'));
    expect(links).not.toContain('referral');
    expect(links).not.toContain('gift');
  });

  it('ссылка в админку только у админа', () => {
    sheet({ isAdmin: true });
    expect(document.querySelector('[data-key="admin"]')).not.toBeNull();
    cleanup();
    sheet({ isAdmin: false });
    expect(document.querySelector('[data-key="admin"]')).toBeNull();
  });

  it('«Выйти» есть в браузере и нет в Telegram', () => {
    sheet();
    expect(screen.queryByText('nav.logout')).not.toBeNull();
    cleanup();
    sheet({ canLogout: false });
    expect(screen.queryByText('nav.logout')).toBeNull();
  });

  it('выход зовёт обработчик', () => {
    const props = sheet();
    fireEvent.click(screen.getByText('nav.logout'));
    expect(props.onLogout).toHaveBeenCalledTimes(1);
  });

  it('закрывается по Esc и по клику на пункт', () => {
    const props = sheet();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getAllByRole('link')[0]);
    expect(props.onClose).toHaveBeenCalledTimes(2);
  });

  it('Esc не срабатывает, пока лист закрыт; содержимое остаётся в DOM скрытым', () => {
    const props = sheet({ open: false });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onClose).not.toHaveBeenCalled();
    const root = document.getElementById('menu');
    expect(root?.hidden).toBe(true);
    expect(screen.queryByTestId('bell')).not.toBeNull();
  });

  it('текущий раздел помечен aria-current', () => {
    sheet({ pathname: '/balance/top-up' });
    const active = document.querySelector('[aria-current="page"]');
    expect(active?.getAttribute('data-key')).toBe('balance');
  });

  it('при открытии блокируется прокрутка страницы, при закрытии возвращается', () => {
    const { unmount } = render(<div />);
    unmount();
    sheet();
    expect(document.body.style.overflow).toBe('hidden');
    cleanup();
    expect(document.body.style.overflow).toBe('');
  });
});
