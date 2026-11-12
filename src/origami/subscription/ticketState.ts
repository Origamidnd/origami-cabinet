import type { Subscription } from '@/types';

export interface TicketState {
  /** Подписка закончилась (не активна и не упёрлась в лимит трафика). */
  expired: boolean;
  /** До конца не больше трёх дней: пластина подсвечивается. */
  urgent: boolean;
  /** Число на билете и его единица: дни, а в последние сутки часы. */
  amount: number;
  unit: 'd' | 'h';
  /** Ключ перевода для метки состояния и её тон. */
  tagKey: string;
  tone: 'ok' | 'warn';
}

type TicketInput = Pick<
  Subscription,
  'is_active' | 'is_limited' | 'is_trial' | 'status' | 'days_left' | 'hours_left'
>;

const URGENT_DAYS = 3;

/** Что показывать на «билете» страницы подписки. Чистая функция, чтобы проверять тестами. */
export function ticketState(sub: TicketInput): TicketState {
  const expired = !sub.is_active && !sub.is_limited;
  const days = Math.max(0, Math.floor(sub.days_left || 0));
  const hours = Math.max(0, Math.floor(sub.hours_left || 0));
  const lastDay = !expired && days === 0;
  const urgent = !expired && days <= URGENT_DAYS;

  let tagKey = 'origami.overview.active';
  let tone: TicketState['tone'] = 'ok';
  if (expired) {
    tagKey =
      sub.status === 'disabled' ? 'subscription.pause.suspended' : 'origami.renew.expiredNoDate';
    tone = 'warn';
  } else if (sub.is_limited) {
    tagKey = 'subscription.trafficLimited';
    tone = 'warn';
  } else if (sub.is_trial) {
    tagKey = 'origami.overview.trial';
  }

  return {
    expired,
    urgent,
    amount: lastDay ? hours : days,
    unit: lastDay ? 'h' : 'd',
    tagKey,
    tone,
  };
}
