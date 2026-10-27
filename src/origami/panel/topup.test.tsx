// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PanelModal from './PanelModal';
import PanelTopUp, { closeTarget, isAmountStep } from './PanelTopUp';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('@/pages/HomeScreen', () => ({ default: () => <div data-testid="overview" /> }));
vi.mock('@/api/balance', () => ({
  balanceApi: { getBalance: () => Promise.resolve({ balance_rubles: 100 }) },
}));
vi.mock('@/hooks/useCurrency', () => ({
  useCurrency: () => ({ formatWithCurrency: (v: number) => `${v} ₽` }),
}));
vi.mock('@/platform', () => ({
  usePlatform: () => ({
    capabilities: { hasBackButton: false },
    backButton: { show: vi.fn(), hide: vi.fn() },
  }),
}));

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
});

describe('помощники пополнения', () => {
  it('шаг суммы - это /balance/top-up/<способ>, но не страница результата', () => {
    expect(isAmountStep('/balance/top-up/sbp')).toBe(true);
    expect(isAmountStep('/balance/top-up/yookassa/')).toBe(true);
    expect(isAmountStep('/balance/top-up')).toBe(false);
    expect(isAmountStep('/balance/top-up/result')).toBe(false);
    expect(isAmountStep('/balance/top-up/result/lava')).toBe(false);
    expect(isAmountStep('/balance')).toBe(false);
  });

  it('закрытие: безопасный returnTo или обзор', () => {
    expect(closeTarget(null)).toBe('/');
    expect(closeTarget('/subscriptions/renew')).toBe('/subscriptions/renew');
    expect(closeTarget('https://evil.example')).toBe('/');
    expect(closeTarget('//evil.example')).toBe('/');
  });
});

describe('PanelModal', () => {
  it('крестик и тень закрывают, Esc зовёт шаг назад и не доходит до обработчиков страницы', () => {
    const onClose = vi.fn();
    const onBack = vi.fn();
    const pageEsc = vi.fn();
    document.addEventListener('keydown', pageEsc);
    render(
      <PanelModal title="Пополнить" onClose={onClose} onBack={onBack}>
        <input aria-label="сумма" />
      </PanelModal>,
    );
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBe('true');
    fireEvent.keyDown(screen.getByLabelText('сумма'), { key: 'Escape' });
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(pageEsc).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    fireEvent.click(screen.getByRole('button', { name: 'origami.sheet.close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    document.removeEventListener('keydown', pageEsc);
  });
});

function Where() {
  const { pathname, search } = useLocation();
  return <div data-testid="where">{pathname + search}</div>;
}

function renderAt(url: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route
            path="/balance/top-up/*"
            element={
              <PanelTopUp>
                <div data-testid="stock-page" />
              </PanelTopUp>
            }
          />
          <Route path="*" element={null} />
        </Routes>
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PanelTopUp', () => {
  it('обзор под окном, стоковая страница внутри окна', () => {
    renderAt('/balance/top-up');
    expect(screen.getByTestId('overview')).toBeTruthy();
    expect(screen.getByRole('dialog').contains(screen.getByTestId('stock-page'))).toBe(true);
  });

  it('Esc на шаге суммы возвращает к выбору способа с теми же amount и returnTo', () => {
    renderAt('/balance/top-up/sbp?amount=500&returnTo=%2Fsubscriptions&foo=1');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.getByTestId('where').textContent).toBe(
      '/balance/top-up?amount=500&returnTo=%2Fsubscriptions',
    );
  });

  it('Esc на выборе способа закрывает окно туда, откуда просили (returnTo)', () => {
    renderAt('/balance/top-up?returnTo=%2Fsubscriptions');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.getByTestId('where').textContent).toBe('/subscriptions');
  });

  it('крестик закрывает на обзор', () => {
    renderAt('/balance/top-up/sbp');
    fireEvent.click(screen.getByRole('button', { name: 'origami.sheet.close' }));
    expect(screen.getByTestId('where').textContent).toBe('/');
  });
});
