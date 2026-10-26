import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { subscriptionApi } from '@/api/subscription';
import { PlusIcon } from '@/components/icons';
import { API } from '@/config/constants';
import { useAuthStore } from '@/store/auth';
import type { Subscription } from '@/types';
import { displayName } from '@/utils/displayName';
import { HelpBlock } from './blocks';
import { longDate, trafficPercent } from './format';

function deviceTitle(d: { local_name?: string | null; device_model: string; platform: string }) {
  return d.local_name?.trim() || d.device_model || d.platform;
}

/**
 * Главная, когда устройство уже подключено: дни, трафик, «Продлить» и «Добавить устройство».
 * «Добавить устройство» открывает экран добавления на шаге «Добавить подписку».
 */
export default function SummaryHome({ subscription }: { subscription: Subscription }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const name = displayName(user);

  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => subscriptionApi.getDevices(),
    staleTime: API.BALANCE_STALE_TIME_MS,
  });

  const unlimited = !(subscription.traffic_limit_gb > 0);
  const until = longDate(subscription.end_date, i18n.language);
  const total = devices?.total ?? 0;
  const limit = devices?.device_limit ?? subscription.device_limit;

  return (
    <div className="og">
      <div className="og-eyebrow">
        {name ? t('origami.summary.eyebrow', { name }) : t('origami.summary.eyebrowNoName')}
      </div>
      <h1 className="og-h1">{t('origami.summary.title')}</h1>

      <section className="og-plate og-plate-fold og-pad" style={{ marginTop: 22 }}>
        <div className="og-row">
          <span className="og-tag og-tag-ok">
            {subscription.is_trial ? t('origami.summary.trial') : t('origami.summary.active')}
          </span>
          {subscription.tariff_name && (
            <span className="og-eyebrow">
              {t('origami.summary.tariff', { name: subscription.tariff_name })}
            </span>
          )}
        </div>
        <div className="og-big">
          {subscription.days_left}
          <small>{t('origami.summary.daysWord', { count: subscription.days_left })}</small>
        </div>
        {until && <div className="og-sm">{t('origami.summary.until', { date: until })}</div>}

        <div className="og-row" style={{ marginTop: 22 }}>
          <span className="og-eyebrow">{t('origami.summary.traffic')}</span>
          <span className="og-eyebrow">
            {unlimited
              ? t('origami.summary.unlimited')
              : `${subscription.traffic_used_gb.toFixed(1)} / ${subscription.traffic_limit_gb} ${t('common.units.gb')}`}
          </span>
        </div>
        {!unlimited && (
          <div className="og-meter" style={{ marginTop: 10 }} role="presentation">
            <i style={{ width: `${trafficPercent(subscription)}%` }} />
          </div>
        )}

        <div className="og-row og-row-start" style={{ marginTop: 22, gap: 14 }}>
          <Link to={`/subscriptions/${subscription.id}/renew`} className="og-btn">
            {t('origami.summary.extend')}
          </Link>
          <button
            type="button"
            className="og-btn og-btn-ghost"
            onClick={() => navigate('/add-device')}
          >
            <PlusIcon className="h-5 w-5" />
            {t('origami.summary.addDevice')}
          </button>
        </div>
      </section>

      <section className="og-plate og-pad-sm" style={{ marginTop: 20 }}>
        <div className="og-row">
          <h2 className="og-h2" style={{ fontSize: 24 }}>
            {t('origami.summary.devices')}
          </h2>
          {limit > 0 && (
            <span className="og-tag">
              {t('origami.summary.deviceLimit', { used: total, limit })}
            </span>
          )}
        </div>
        {devices && devices.devices.length > 0 ? (
          devices.devices.map((d) => (
            <div className="og-dev" key={d.hwid}>
              <div className="og-dev-ico" aria-hidden="true">
                {deviceTitle(d).charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <b style={{ overflowWrap: 'anywhere' }}>{deviceTitle(d)}</b>
                <div className="og-sm">
                  {[d.platform, longDate(d.created_at, i18n.language)].filter(Boolean).join(', ')}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="og-sm" style={{ marginTop: 10 }}>
            {t('origami.summary.noDevices')}
          </p>
        )}
      </section>

      <HelpBlock
        title={t('origami.summary.helpTitle')}
        text={t('origami.summary.helpText')}
        button={t('origami.summary.helpButton')}
      />
    </div>
  );
}
