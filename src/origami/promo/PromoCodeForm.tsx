import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { balanceApi } from '@/api/balance';
import { Button } from '@/components/primitives/Button';
import { useAuthStore } from '@/store/auth';
import { registerOrigamiLocales } from '../i18n';

registerOrigamiLocales();

/** Коды ошибок бэкенда, для которых в стоковых переводах есть текст (`balance.promocode.errors.*`). */
const KNOWN_ERRORS = [
  'not_found',
  'expired',
  'inactive',
  'not_yet_valid',
  'used',
  'already_used_by_user',
  'active_discount_exists',
  'no_subscription_for_days',
  'subscription_not_found',
  'not_first_purchase',
  'daily_limit',
  'trial_subscription_exists',
  'trial_provisioning_failed',
  'user_not_found',
  'server_error',
];

type EligibleSub = { id: number; tariff_name: string; days_left: number };

/**
 * Ввод промокода в окне пополнения: свёрнут в ссылку «Есть промокод?», раскрывается по клику
 * или сразу (`initiallyOpen`, переход из виджета баланса). Логика и тексты как у стоковой
 * страницы «Баланс»: выбор подписки, если код подходит к нескольким, и коды ошибок бэкенда.
 */
export default function PromoCodeForm({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const [open, setOpen] = useState(initiallyOpen);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ message: string; amount: number } | null>(null);
  const [selectSubs, setSelectSubs] = useState<EligibleSub[] | null>(null);
  const [selectCode, setSelectCode] = useState<string | null>(null);

  const activate = async (subscriptionId?: number) => {
    const value = subscriptionId ? selectCode || '' : code.trim();
    if (!value) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await balanceApi.activatePromocode(value, subscriptionId);
      if (result.error === 'select_subscription' && result.eligible_subscriptions) {
        setSelectSubs(result.eligible_subscriptions);
        setSelectCode(result.code || value);
        return;
      }
      if (result.success) {
        setSuccess({
          message: result.bonus_description || t('balance.promocode.success'),
          amount: (result.balance_after || 0) - (result.balance_before || 0),
        });
        setCode('');
        setSelectSubs(null);
        setSelectCode(null);
        await refreshUser();
        for (const key of [
          'balance',
          'transactions',
          'purchase-options',
          'subscriptions-list',
          'subscription',
        ]) {
          queryClient.invalidateQueries({ queryKey: [key] });
        }
      }
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: { code?: string } | string } } })
        .response?.data?.detail;
      const errCode = typeof detail === 'object' && detail ? detail.code : undefined;
      const key = errCode && KNOWN_ERRORS.includes(errCode) ? errCode : 'server_error';
      setError(t(`balance.promocode.errors.${key}`));
      setSelectSubs(null);
      setSelectCode(null);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="og-link og-promo-toggle" onClick={() => setOpen(true)}>
        {t('origami.promo.toggle')}
      </button>
    );
  }

  return (
    <section className="og-promo" data-testid="promo-form">
      <div className="og-eyebrow">{t('balance.promocode.title')}</div>
      <div className="og-promo-row">
        <input
          type="text"
          value={code}
          autoFocus
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && activate()}
          placeholder={t('balance.promocode.placeholder')}
          className="input min-w-0 flex-1"
          disabled={loading}
          aria-label={t('balance.promocode.title')}
        />
        <Button onClick={() => activate()} disabled={!code.trim()} loading={loading}>
          {t('balance.promocode.activate')}
        </Button>
      </div>
      {error && (
        <div className="og-promo-msg og-promo-err" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="og-promo-msg og-promo-ok" role="status">
          <div>{success.message}</div>
          {success.amount > 0 && (
            <div>{t('balance.promocode.balanceAdded', { amount: success.amount.toFixed(2) })}</div>
          )}
        </div>
      )}
      {selectSubs && selectSubs.length > 0 && (
        <div className="og-promo-msg og-promo-pick">
          <div>
            {t('balance.promocode.selectSubscription', 'К какой подписке применить промокод?')}
          </div>
          {selectSubs.map((sub) => (
            <button
              key={sub.id}
              type="button"
              className="og-promo-sub"
              onClick={() => activate(sub.id)}
              disabled={loading}
            >
              <span className="truncate">{sub.tariff_name}</span>
              <span>
                {t('balance.promocode.daysLeft', '{{count}} дн.', { count: sub.days_left })}
              </span>
            </button>
          ))}
          <button
            type="button"
            className="og-link"
            onClick={() => {
              setSelectSubs(null);
              setSelectCode(null);
            }}
          >
            {t('common.cancel', 'Отмена')}
          </button>
        </div>
      )}
    </section>
  );
}
