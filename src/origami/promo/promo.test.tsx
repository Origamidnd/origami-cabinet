// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PromoCodeForm from './PromoCodeForm';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, def?: unknown) => (typeof def === 'string' ? def : key),
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
const activate = vi.fn();
vi.mock('@/api/balance', () => ({
  balanceApi: { activatePromocode: (...a: unknown[]) => activate(...a) },
}));
vi.mock('@/store/auth', () => ({
  useAuthStore: (sel: (s: { refreshUser: () => Promise<void> }) => unknown) =>
    sel({ refreshUser: () => Promise.resolve() }),
}));

vi.mock('@/platform', () => ({
  usePlatform: () => ({
    capabilities: { hasBackButton: false, hasHapticFeedback: false },
    backButton: { show: vi.fn(), hide: vi.fn() },
    haptic: { impact: vi.fn(), notification: vi.fn(), selection: vi.fn() },
  }),
  useHaptic: () => ({ impact: vi.fn(), notification: vi.fn(), selection: vi.fn() }),
}));

const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

afterEach(() => {
  cleanup();
  activate.mockReset();
});

describe('PromoCodeForm', () => {
  it('свёрнут в ссылку и раскрывается по клику', () => {
    wrap(<PromoCodeForm />);
    expect(screen.queryByTestId('promo-form')).toBeNull();
    fireEvent.click(screen.getByText('origami.promo.toggle'));
    expect(screen.getByTestId('promo-form')).toBeTruthy();
  });

  it('из виджета баланса открывается сразу', () => {
    wrap(<PromoCodeForm initiallyOpen />);
    expect(screen.getByRole('textbox')).toBeTruthy();
  });

  it('активирует код и показывает успех', async () => {
    activate.mockResolvedValue({
      success: true,
      bonus_description: 'Скидка 20%',
      balance_before: 0,
      balance_after: 0,
    });
    wrap(<PromoCodeForm initiallyOpen />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: ' ORIGAMI20 ' } });
    fireEvent.click(screen.getByText('balance.promocode.activate'));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Скидка 20%'));
    expect(activate).toHaveBeenCalledWith('ORIGAMI20', undefined);
  });

  it('предлагает выбрать подписку, если код подходит к нескольким', async () => {
    activate
      .mockResolvedValueOnce({
        error: 'select_subscription',
        code: 'X',
        eligible_subscriptions: [{ id: 7, tariff_name: 'Plus', days_left: 12 }],
      })
      .mockResolvedValueOnce({ success: true, balance_before: 0, balance_after: 0 });
    wrap(<PromoCodeForm initiallyOpen />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'X' } });
    fireEvent.click(screen.getByText('balance.promocode.activate'));
    fireEvent.click(await screen.findByText('Plus'));
    await waitFor(() => expect(activate).toHaveBeenLastCalledWith('X', 7));
  });

  it('переводит код ошибки бэкенда', async () => {
    activate.mockRejectedValue({ response: { data: { detail: { code: 'expired' } } } });
    wrap(<PromoCodeForm initiallyOpen />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'OLD' } });
    fireEvent.click(screen.getByText('balance.promocode.activate'));
    expect((await screen.findByRole('alert')).textContent).toBe('balance.promocode.errors.expired');
  });
});
