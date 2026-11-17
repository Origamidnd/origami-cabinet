import type { InvoiceStatus } from '@/platform/types';

/**
 * Открытие счёта Telegram Stars внутри Mini App, по очереди тремя способами.
 *
 * Зачем: в Telegram Desktop счёт из ЛК не открывался. SDK `openInvoice` бросает исключение, если считает
 * окно оплаты уже открытым (после первой неудачной попытки) или функция недоступна, а стоковый запасной
 * путь `window.open` встроенное окно Telegram Desktop молча блокирует, и клиент видит "ничего не происходит".
 *
 * 1. SDK, если он доступен и окно оплаты не считается открытым.
 * 2. Старый глобальный `window.Telegram.WebApp.openInvoice` (telegram-web-app.js подключён в index.html).
 * 3. Ссылка на счёт через Telegram (`openTelegramLink`): клиент Telegram сам открывает оплату по `t.me/$...`.
 */
export interface OpenInvoiceDeps {
  sdkAvailable: () => boolean;
  sdkOpened: () => boolean;
  sdkOpen: (url: string) => Promise<InvoiceStatus>;
  legacyOpenInvoice?: ((url: string, callback: (status: string) => void) => void) | null;
  openTelegramLink: (url: string) => void;
}

const KNOWN: readonly InvoiceStatus[] = ['paid', 'cancelled', 'failed', 'pending'];

function normalize(status: string): InvoiceStatus {
  return (KNOWN as readonly string[]).includes(status) ? (status as InvoiceStatus) : 'pending';
}

export async function openInvoiceWithFallbacks(
  url: string,
  deps: OpenInvoiceDeps,
): Promise<InvoiceStatus> {
  let sdkUsable = false;
  try {
    sdkUsable = deps.sdkAvailable() && !deps.sdkOpened();
  } catch {
    sdkUsable = false;
  }
  if (sdkUsable) {
    try {
      return normalize(await deps.sdkOpen(url));
    } catch {
      // дальше по цепочке
    }
  }

  const legacy = deps.legacyOpenInvoice;
  if (typeof legacy === 'function') {
    try {
      return await new Promise<InvoiceStatus>((resolve, reject) => {
        try {
          legacy(url, (status) => resolve(normalize(status)));
        } catch (error) {
          reject(error);
        }
      });
    } catch {
      // дальше по цепочке
    }
  }

  deps.openTelegramLink(url);
  return 'pending';
}

/** Звёзды оплачиваются только внутри Telegram: в обычном браузере способ не показываем. */
export function hideStarsOutsideTelegram<T extends { id: string }>(
  methods: T[],
  inTelegram: boolean,
): T[] {
  if (inTelegram) return methods;
  return methods.filter((method) => !method.id.toLowerCase().includes('stars'));
}
