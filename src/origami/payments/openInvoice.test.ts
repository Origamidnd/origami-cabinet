import { describe, expect, it, vi } from 'vitest';
import {
  hideStarsOutsideTelegram,
  openInvoiceWithFallbacks,
  type OpenInvoiceDeps,
} from './openInvoice';

const URL = 'https://t.me/$AbCdEf';

function deps(over: Partial<OpenInvoiceDeps> = {}): OpenInvoiceDeps {
  return {
    sdkAvailable: () => true,
    sdkOpened: () => false,
    sdkOpen: vi.fn(async () => 'paid' as const),
    legacyOpenInvoice: vi.fn((_u: string, cb: (s: string) => void) => cb('paid')),
    openTelegramLink: vi.fn(),
    ...over,
  };
}

describe('openInvoiceWithFallbacks', () => {
  it('SDK доступен и окно не открыто: оплата через SDK, остальное не трогаем', async () => {
    const d = deps();
    await expect(openInvoiceWithFallbacks(URL, d)).resolves.toBe('paid');
    expect(d.sdkOpen).toHaveBeenCalledWith(URL);
    expect(d.legacyOpenInvoice).not.toHaveBeenCalled();
    expect(d.openTelegramLink).not.toHaveBeenCalled();
  });

  it('SDK считает окно уже открытым (зависшая первая попытка): идём в старый openInvoice', async () => {
    const d = deps({ sdkOpened: () => true });
    await expect(openInvoiceWithFallbacks(URL, d)).resolves.toBe('paid');
    expect(d.sdkOpen).not.toHaveBeenCalled();
    expect(d.legacyOpenInvoice).toHaveBeenCalledWith(URL, expect.any(Function));
  });

  it('SDK бросает исключение: идём в старый openInvoice', async () => {
    const d = deps({
      sdkOpen: vi.fn(async () => {
        throw new Error('not supported');
      }),
    });
    await expect(openInvoiceWithFallbacks(URL, d)).resolves.toBe('paid');
    expect(d.legacyOpenInvoice).toHaveBeenCalled();
  });

  it('ни SDK, ни старого openInvoice: ссылка уходит в Telegram, а не в window.open', async () => {
    const d = deps({ sdkAvailable: () => false, legacyOpenInvoice: null });
    await expect(openInvoiceWithFallbacks(URL, d)).resolves.toBe('pending');
    expect(d.openTelegramLink).toHaveBeenCalledWith(URL);
  });

  it('старый openInvoice бросает исключение: тоже ссылка через Telegram', async () => {
    const d = deps({
      sdkAvailable: () => false,
      legacyOpenInvoice: vi.fn(() => {
        throw new Error('WebAppMethodUnsupported');
      }),
    });
    await expect(openInvoiceWithFallbacks(URL, d)).resolves.toBe('pending');
    expect(d.openTelegramLink).toHaveBeenCalledWith(URL);
  });

  it('неизвестный статус из старого API считается pending', async () => {
    const d = deps({ sdkAvailable: () => false, legacyOpenInvoice: (_u, cb) => cb('weird') });
    await expect(openInvoiceWithFallbacks(URL, d)).resolves.toBe('pending');
  });
});

describe('hideStarsOutsideTelegram', () => {
  const methods = [{ id: 'telegram_stars' }, { id: 'yookassa' }, { id: 'platega' }];

  it('в Telegram звёзды остаются', () => {
    expect(hideStarsOutsideTelegram(methods, true).map((m) => m.id)).toEqual([
      'telegram_stars',
      'yookassa',
      'platega',
    ]);
  });

  it('в обычном браузере звёзды скрыты, остальное на месте', () => {
    expect(hideStarsOutsideTelegram(methods, false).map((m) => m.id)).toEqual([
      'yookassa',
      'platega',
    ]);
  });
});
