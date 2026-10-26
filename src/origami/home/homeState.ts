import type { Subscription } from '@/types';

/**
 * Что показывать на главной.
 *
 * - `wizard`  - подписка работает, но устройств нет и трафика не было: ведём по шагам подключения;
 * - `summary` - подписка работает и устройство уже подключалось (или человек отказался от мастера);
 * - `renew`   - подписка закончилась: показываем продление;
 * - `stock`   - любой другой случай оставляем стоковой главной (триал и покупка, выбор тарифа,
 *               пауза суточного тарифа, исчерпанный трафик, мультитариф);
 * - `loading` - данных ещё нет, ничего не решаем, чтобы не мигать мастером.
 */
export type HomeState = 'loading' | 'wizard' | 'summary' | 'renew' | 'stock';

export interface HomeStateInput {
  /** Включён мультитариф: подписок несколько, одиночное правило к ним не применимо. */
  multiTariff: boolean;
  /** Подписка (или список подписок) ещё грузится. */
  subscriptionLoading: boolean;
  subscription: Subscription | null;
  /** Список устройств ещё грузится. */
  devicesLoading: boolean;
  /** Число устройств в панели; `null`, если запрос не удался и число неизвестно. */
  devicesTotal: number | null;
  /** Человек нажал «Я уже всё настроил(а)». */
  wizardDismissed: boolean;
}

/** Подписка в рабочем состоянии: действует и не помечена как просроченная. */
function isRunning(s: Subscription): boolean {
  return s.is_active && !s.is_expired;
}

/**
 * Чистое правило выбора состояния главной.
 *
 * Клиенты без HWID (часть десктопных) в список устройств не попадают никогда, поэтому «устройств нет»
 * само по себе мастер не включает: нужен ещё нулевой трафик. Как только трафик пошёл, человек
 * подключился, и мастер ему больше не навязываем.
 */
export function resolveHomeState(input: HomeStateInput): HomeState {
  if (input.multiTariff) return 'stock';
  if (input.subscriptionLoading) return 'loading';

  const sub = input.subscription;
  // Нет подписки: стоковый блок с триалом и кнопкой покупки уже делает всё нужное.
  if (!sub) return 'stock';

  // Старая подписка без тарифа: продления нет, только переход на тариф - это стоковая карточка.
  if (sub.requires_tariff_selection) return 'stock';

  if (sub.is_expired) return 'renew';

  // Отключена, трафик исчерпан или суточный тариф на паузе: у стока есть свои сообщения и действия.
  if (sub.status === 'disabled' || sub.is_limited || sub.is_daily_paused) return 'stock';
  if (!isRunning(sub)) return 'stock';

  if (input.devicesLoading) return 'loading';

  // Число устройств неизвестно (запрос упал): лучше обычная сводка, чем мастер человеку, который уже подключён.
  if (input.devicesTotal === null) return 'summary';

  const noDevices = input.devicesTotal === 0;
  const noTraffic = !(sub.traffic_used_gb > 0);
  if (noDevices && noTraffic && !input.wizardDismissed) return 'wizard';
  return 'summary';
}
