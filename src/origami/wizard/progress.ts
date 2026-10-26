/**
 * Прогресс мастера подключения.
 *
 * Хранится в localStorage и, если доступно, в Telegram CloudStorage: из VPN-приложения человек
 * возвращается в Mini App, и страница может перезагрузиться, а место в мастере терять нельзя.
 */

export type WizardStep = 1 | 2 | 3;

export interface WizardProgress {
  /** Текущий шаг: 1 - установить, 2 - добавить подписку, 3 - проверить. */
  step: WizardStep;
  /** «Я уже всё настроил(а)»: мастер не показывается на главной, но остаётся по кнопке «Добавить устройство». */
  dismissed: boolean;
  /** Выбранное приложение (идентификатор из конфигурации приложений), если человек выбирал вручную. */
  appId: string | null;
}

export const WIZARD_STORAGE_KEY = 'origami.wizard';
/** Ключ CloudStorage: допустимы только латиница, цифры, подчёркивание и дефис. */
export const WIZARD_CLOUD_KEY = 'origami_wizard';

export const DEFAULT_PROGRESS: WizardProgress = { step: 1, dismissed: false, appId: null };

function isStep(value: unknown): value is WizardStep {
  return value === 1 || value === 2 || value === 3;
}

/** Разбирает сохранённую строку; любой мусор даёт значения по умолчанию, а не ошибку. */
export function parseProgress(raw: string | null | undefined): WizardProgress {
  if (!raw) return DEFAULT_PROGRESS;
  try {
    const data = JSON.parse(raw) as Partial<Record<keyof WizardProgress, unknown>> | null;
    if (!data || typeof data !== 'object') return DEFAULT_PROGRESS;
    return {
      step: isStep(data.step) ? data.step : 1,
      dismissed: data.dismissed === true,
      appId: typeof data.appId === 'string' && data.appId ? data.appId : null,
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function serializeProgress(progress: WizardProgress): string {
  return JSON.stringify(progress);
}

export function sameProgress(a: WizardProgress, b: WizardProgress): boolean {
  return a.step === b.step && a.dismissed === b.dismissed && a.appId === b.appId;
}

/**
 * Склейка локального значения с облачным: отказ от мастера и продвинутый шаг не теряются ни с одной
 * стороны, приложение берём локальное, а если его нет - облачное.
 */
export function mergeProgress(local: WizardProgress, remote: WizardProgress): WizardProgress {
  return {
    step: Math.max(local.step, remote.step) as WizardStep,
    dismissed: local.dismissed || remote.dismissed,
    appId: local.appId ?? remote.appId,
  };
}
