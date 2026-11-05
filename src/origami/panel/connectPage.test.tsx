// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { findAddHelp, hasAddButton } from '../connect/connectModel';
import ConnectPageView, { type ConnectPageViewProps } from './ConnectPageView';
import PanelAddDevice from './PanelAddDevice';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('./PanelConnect', () => ({
  default: ({ onBack, onDone }: { onBack: () => void; onDone: () => void }) => (
    <>
      <button type="button" data-testid="back" onClick={onBack}>
        back
      </button>
      <button type="button" data-testid="done" onClick={onDone}>
        done
      </button>
    </>
  ),
}));

afterEach(cleanup);

function props(patch: Partial<ConnectPageViewProps> = {}): ConnectPageViewProps {
  return {
    onBack: vi.fn(),
    onDone: vi.fn(),
    configured: true,
    platforms: [
      { key: 'ios', label: 'iPhone / iPad', selected: true },
      { key: 'android', label: 'Android', selected: false },
    ],
    onPlatform: vi.fn(),
    apps: [
      { name: 'INCY', recommended: true, selected: true },
      { name: 'Happ', recommended: false, selected: false },
    ],
    onApp: vi.fn(),
    appName: 'INCY',
    step: 1,
    installLinks: [{ url: 'https://store.example.test/incy', label: 'App Store' }],
    installText: '',
    onInstall: vi.fn(),
    canAdd: true,
    onAdd: vi.fn(),
    addHelp: 'Вставьте ссылку вручную.',
    connectState: 'idle',
    qrUrl: 'https://example.test/sub/abc',
    hideLink: false,
    copied: false,
    onCopy: vi.fn(),
    ...patch,
  };
}

function open(patch: Partial<ConnectPageViewProps> = {}) {
  const p = props(patch);
  render(
    <MemoryRouter>
      <ConnectPageView {...p} />
    </MemoryRouter>,
  );
  return p;
}

describe('экран «Подключить устройство»', () => {
  it('установка: кнопка на каждую ссылку с подписью из конфига, без подписи - «Скачать»', () => {
    const p = open({
      installLinks: [
        { url: 'https://example.test/a.deb', label: '.deb' },
        { url: 'https://example.test/a.rpm', label: '' },
      ],
    });
    const links = screen.getByTestId('install-links').querySelectorAll('a');
    expect([...links].map((a) => a.textContent)).toEqual(['.deb', 'origami.sheet.step1.button']);
    fireEvent.click(links[0]);
    expect(p.onInstall).toHaveBeenCalled();
  });

  it('устройство и приложение переключаются, рекомендуемое помечено', () => {
    const p = open();
    fireEvent.click(screen.getByRole('tab', { name: 'Android' }));
    expect(p.onPlatform).toHaveBeenCalledWith('android');
    fireEvent.click(screen.getByRole('radio', { name: /Happ/ }));
    expect(p.onApp).toHaveBeenCalledWith('Happ');
    expect(screen.getAllByText('origami.add.recommended')).toHaveLength(1);
    expect(screen.getByRole('radio', { name: /INCY/ }).getAttribute('aria-checked')).toBe('true');
  });

  it('кнопка «Добавить» доступна сразу, без шага установки', () => {
    const p = open({ step: 1 });
    const add = screen.getByRole('button', { name: /origami.connect.add/ });
    expect((add as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(add);
    expect(p.onAdd).toHaveBeenCalled();
  });

  it('приложение без кнопки: главное действие - скопировать ссылку', () => {
    const p = open({ canAdd: false });
    expect(screen.queryByRole('button', { name: /origami.connect.add/ })).toBeNull();
    expect(screen.getByText('origami.connect.step2Manual')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /origami.connect.copy/ }));
    expect(p.onCopy).toHaveBeenCalled();
  });

  it('вторичные приложения сворачиваются за одной строкой', () => {
    open();
    const happ = screen.getByRole('radio', { name: /Happ/ });
    expect(happ.classList.contains('og-cn-extra')).toBe(true);
    expect(happ.classList.contains('is-open')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'origami.connect.more' }));
    expect(happ.classList.contains('is-open')).toBe(true);
    expect(screen.queryByRole('button', { name: 'origami.connect.more' })).toBeNull();
  });

  it('пройденные шаги отмечены галочкой', () => {
    const { container } = render(
      <MemoryRouter>
        <ConnectPageView {...props({ step: 3 })} />
      </MemoryRouter>,
    );
    expect(container.querySelectorAll('.og-cn-step-done')).toHaveLength(2);
    expect(container.querySelectorAll('.og-cn-step-cur')).toHaveLength(1);
  });

  it('ожидание и подключение устройства на шаге 3', () => {
    const p = open({ step: 3, connectState: 'waiting' });
    expect(screen.getByRole('status').textContent).toContain('origami.connect.waiting');
    cleanup();
    const q = open({ step: 3, connectState: 'connected' });
    expect(screen.getByRole('status').textContent).toContain('origami.connect.connected');
    fireEvent.click(screen.getByRole('button', { name: 'origami.connect.done' }));
    expect(q.onDone).toHaveBeenCalled();
    expect(p.onDone).not.toHaveBeenCalled();
  });

  it('«Скопировать ссылку» скрыта при hideLink, QR остаётся', () => {
    open({ hideLink: true });
    expect(screen.queryByRole('button', { name: /origami.connect.copy/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'origami.add.qrOpen' })).toBeTruthy();
  });

  it('если приложения не настроены, предлагает стоковую страницу подключения', () => {
    open({ configured: false });
    expect(screen.getByRole('link', { name: 'origami.connect.open' }).getAttribute('href')).toBe(
      '/connection',
    );
  });
});

describe('модель подключения', () => {
  const button = (type: string) => ({ type, link: 'x://y', text: {} });
  const app = (blocks: unknown[], deepLink?: string) =>
    ({ name: 'A', deepLink, blocks }) as unknown as Parameters<typeof hasAddButton>[0];

  it('кнопка добавления есть у приложения со ссылкой или блоком subscriptionLink', () => {
    expect(hasAddButton(app([{ buttons: [button('subscriptionLink')] }]))).toBe(true);
    expect(hasAddButton(app([], 'app://add'))).toBe(true);
    expect(hasAddButton(app([{ buttons: [button('external')] }]))).toBe(false);
    expect(hasAddButton(null)).toBe(false);
  });

  it('из описания берётся только часть про «если не открылось»', () => {
    const description = {
      ru: 'Нажмите кнопку \u2014 INCY откроется Если не открылось \u2014 в INCY нажмите +',
    };
    const a = app([{ description, buttons: [button('subscriptionLink')] }]);
    expect(findAddHelp(a, 'ru')).toBe('В INCY нажмите +');
    const plain = app([{ description: { ru: 'Текст' }, buttons: [button('subscriptionLink')] }]);
    expect(findAddHelp(plain, 'ru')).toBe('Текст');
  });
});

describe('маршрут /add-device', () => {
  const renderAt = (entry: string) =>
    render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/" element={<div data-testid="root-page" />} />
          <Route path="/devices" element={<div data-testid="devices-page" />} />
          <Route path="/add-device" element={<PanelAddDevice />} />
        </Routes>
      </MemoryRouter>,
    );

  it('«Назад» при входе по ссылке ведёт на обзор', () => {
    renderAt('/add-device');
    fireEvent.click(screen.getByTestId('back'));
    expect(screen.getByTestId('root-page')).toBeTruthy();
  });

  it('готово ведёт к списку устройств', () => {
    renderAt('/add-device');
    fireEvent.click(screen.getByTestId('done'));
    expect(screen.getByTestId('devices-page')).toBeTruthy();
  });
});
