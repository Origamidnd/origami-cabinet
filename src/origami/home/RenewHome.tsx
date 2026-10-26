import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { balanceApi } from '@/api/balance';
import { subscriptionApi } from '@/api/subscription';
import { API } from '@/config/constants';
import { useCurrency } from '@/hooks/useCurrency';
import { useAuthStore } from '@/store/auth';
import type { Subscription } from '@/types';
import { displayName } from '@/utils/displayName';
import { HelpBlock, SummaryStrip } from './blocks';
import { daysSince, relativeDaysAgo, trafficPercentLabel } from './format';

/** Главная, когда подписка закончилась: одно действие (продлить), без мастера. */
export default function RenewHome({ subscription }: { subscription: Subscription }) {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const name = displayName(user);
  const { formatWithCurrency } = useCurrency();

  const { data: balance } = useQuery({
    queryKey: ['balance'],
    queryFn: balanceApi.getBalance,
    staleTime: API.BALANCE_STALE_TIME_MS,
  });
  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => subscriptionApi.getDevices(),
    staleTime: API.BALANCE_STALE_TIME_MS,
  });

  const ago = daysSince(subscription.end_date);
  const expired = ago === null ? '' : relativeDaysAgo(ago, i18n.language);
  const trafficLabel = trafficPercentLabel(subscription);
  const rubles = balance ? formatWithCurrency(balance.balance_rubles) : '-';

  return (
    <div className="og">
      <div className="og-eyebrow">
        {name ? t('origami.summary.eyebrow', { name }) : t('origami.summary.eyebrowNoName')}
      </div>
      <h1 className="og-h1">{t('origami.renew.title')}</h1>

      <section className="og-plate og-plate-fold og-pad" style={{ marginTop: 22 }}>
        <div className="og-row">
          <span className="og-tag og-tag-warn">
            {expired
              ? t('origami.renew.expired', { when: expired })
              : t('origami.renew.expiredNoDate')}
          </span>
          {subscription.tariff_name && (
            <span className="og-eyebrow">
              {t('origami.summary.tariff', { name: subscription.tariff_name })}
            </span>
          )}
        </div>
        <p className="og-sm" style={{ margin: '14px 0 18px' }}>
          {t('origami.renew.text')}
        </p>
        <Link to={`/subscriptions/${subscription.id}/renew`} className="og-btn og-btn-lg">
          {t('origami.renew.extend')}
        </Link>
        <div className="og-row og-row-start" style={{ marginTop: 14 }}>
          <Link to="/subscription/purchase" className="og-link">
            {t('origami.renew.changePlan')}
          </Link>
        </div>
      </section>

      <SummaryStrip
        cells={[
          { label: t('origami.renew.balance'), value: rubles },
          { label: t('origami.renew.traffic'), value: trafficLabel },
          {
            label: t('origami.renew.devices'),
            value: devices
              ? t('origami.summary.deviceLimit', {
                  used: devices.total,
                  limit: devices.device_limit,
                })
              : '-',
          },
        ]}
      />

      <HelpBlock
        title={t('origami.renew.helpTitle')}
        text={t('origami.renew.helpText')}
        button={t('origami.summary.helpButton')}
      />
    </div>
  );
}
