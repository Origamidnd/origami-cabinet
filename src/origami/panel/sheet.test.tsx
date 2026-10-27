// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ConnectSheetView, { type ConnectSheetViewProps } from './ConnectSheetView';
import PanelAddDevice from './PanelAddDevice';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@/pages/HomeScreen', () => ({ default: () => <div data-testid="overview" /> }));
vi.mock('./PanelConnectSheet', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <button type="button" data-testid="sheet" onClick={onClose}>
      sheet
    </button>
  ),
}));

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
});

function props(patch: Partial<ConnectSheetViewProps> = {}): ConnectSheetViewProps {
  return {
    onClose: vi.fn(),
    configured: true,
    platforms: [
      { key: 'ios', label: 'iPhone / iPad', selected: true },
      { key: 'android', label: 'Android', selected: false },
    ],
    onPlatform: vi.fn(),
    apps: [
      { name: 'Happ', recommended: false, oneTap: true, selected: false },
      { name: 'INCY', recommended: true, oneTap: true, selected: true },
    ],
    onApp: vi.fn(),
    appName: 'INCY',
    step: 1,
    installLinks: [{ url: 'https://store.example.test/incy', label: 'App Store' }],
    installText: '',
    onInstall: vi.fn(),
    canAdd: true,
    onAdd: vi.fn(),
    connectState: 'idle',
    qrUrl: 'https://example.test/sub/abc',
    hideLink: false,
    copied: false,
    onCopy: vi.fn(),
    ...patch,
  };
}

function open(patch: Partial<ConnectSheetViewProps> = {}) {
  const p = props(patch);
  const opener = document.createElement('button');
  document.body.appendChild(opener);
  opener.focus();
  const view = render(
    <MemoryRouter>
      <ConnectSheetView {...p} />
    </MemoryRouter>,
  );
  return { p, opener, view };
}

describe('штора «Подключить устройство»', () => {
  it('шаг установки: кнопка на каждую ссылку с подписью из конфига, без подписи - «Скачать»', () => {
    open({
      installLinks: [
        { url: 'https://x.test/a.deb', label: '.deb (Ubuntu/Debian)' },
        { url: 'https://x.test/a.rpm', label: '' },
      ],
      installText: 'Скачайте Happ с GitHub',
    });
    const links = [...screen.getByTestId('install-links').querySelectorAll('a')];
    expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['.deb (Ubuntu/Debian)', 'https://x.test/a.deb'],
      ['origami.sheet.step1.button', 'https://x.test/a.rpm'],
    ]);
    expect(screen.getByText('Скачайте Happ с GitHub')).toBeTruthy();
  });

  it('диалог: aria-modal, подпись, фокус внутри', () => {
    open();
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('og-sheet-title');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('закрывается крестиком, Esc и кликом в затемнение', () => {
    const { p } = open();
    fireEvent.click(screen.getByRole('button', { name: 'origami.sheet.close' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByTestId('sheet-backdrop'));
    expect(p.onClose).toHaveBeenCalledTimes(3);
  });

  it('Tab ходит по кругу внутри шторы', () => {
    open();
    const dialog = screen.getByRole('dialog');
    const items = [...dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')];
    const last = items[items.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(items[0]);
    items[0].focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('при закрытии фокус возвращается на кнопку, открывшую штору, и снимается блокировка прокрутки', () => {
    const { opener, view } = open();
    expect(document.body.style.overflow).toBe('hidden');
    view.unmount();
    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).toBe('');
  });

  it('платформа и приложение переключаются, рекомендуемое помечено', () => {
    const { p } = open();
    fireEvent.click(screen.getByRole('tab', { name: 'Android' }));
    expect(p.onPlatform).toHaveBeenCalledWith('android');
    fireEvent.click(screen.getByRole('radio', { name: /Happ/ }));
    expect(p.onApp).toHaveBeenCalledWith('Happ');
    expect(screen.getAllByText('origami.add.recommended')).toHaveLength(1);
    expect(screen.getByRole('radio', { name: /INCY/ }).getAttribute('aria-checked')).toBe('true');
  });

  it('три шага: «Скачать» и «Добавить» зовут свои обработчики', () => {
    const { p } = open();
    fireEvent.click(screen.getByText('App Store'));
    fireEvent.click(screen.getByText('origami.wizard.step2.add'));
    expect(p.onInstall).toHaveBeenCalledTimes(1);
    expect(p.onAdd).toHaveBeenCalledTimes(1);
  });

  it('пройденные шаги отмечены галочкой по текущему шагу', () => {
    open({ step: 3 });
    const items = [...document.querySelectorAll('.og-sstep')].map((n) => n.className);
    expect(items[0]).toContain('og-sstep-done');
    expect(items[1]).toContain('og-sstep-done');
    expect(items[2]).toContain('og-sstep-cur');
  });

  it('ожидание и подключение устройства на шаге 3', () => {
    open({ connectState: 'waiting' });
    expect(screen.getByText('origami.wizard.step3.waiting')).toBeTruthy();
    cleanup();
    const { p } = open({ connectState: 'connected' });
    expect(screen.getByText('origami.add.connected')).toBeTruthy();
    fireEvent.click(screen.getByText('origami.add.done'));
    expect(p.onClose).toHaveBeenCalledTimes(1);
  });

  it('«Скопировать ссылку» скрыта при hideLink, QR остаётся', () => {
    open({ hideLink: true });
    expect(screen.queryByText('origami.add.copy')).toBeNull();
    expect(document.querySelector('.og-qr svg')).not.toBeNull();
  });

  it('если приложения не настроены, предлагает стоковую страницу подключения', () => {
    open({ configured: false });
    expect(
      screen.getByRole('link', { name: 'origami.wizard.openConnection' }).getAttribute('href'),
    ).toBe('/connection');
  });
});

describe('маршрут /add-device', () => {
  const renderAt = (entry: string) =>
    render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/" element={<div data-testid="root-page" />} />
          <Route path="/add-device" element={<PanelAddDevice />} />
        </Routes>
      </MemoryRouter>,
    );

  it('открывает штору поверх обзора', () => {
    renderAt('/add-device');
    expect(screen.getByTestId('overview')).toBeTruthy();
    expect(screen.getByTestId('sheet')).toBeTruthy();
  });

  it('закрытие при входе по ссылке ведёт на обзор', () => {
    renderAt('/add-device');
    fireEvent.click(screen.getByTestId('sheet'));
    expect(screen.getByTestId('root-page')).toBeTruthy();
    expect(screen.queryByTestId('sheet')).toBeNull();
  });
});
