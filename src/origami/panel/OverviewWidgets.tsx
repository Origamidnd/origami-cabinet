import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { PlusIcon } from '@/components/icons';
import type { Subscription } from '@/types';
import { HelpBlock } from '../home/blocks';
import { daysSince, longDate, relativeDaysAgo, trafficPercent } from '../home/format';
import { registerOrigamiLocales } from '../i18n';

registerOrigamiLocales();

export type OverviewState = 'wizard' | 'summary' | 'renew';

export interface OverviewDevice {
  hwid: string;
  platform: string;
  device_model: string;
  local_name?: string | null;
  created_at: string | null;
}

export interface OverviewReferral {
  total: number;
  active: number;
  /** Заработано, уже отформатировано (валюта по языку). */
  earnedText: string;
  percent: number;
}

export interface OverviewProps {
  state: OverviewState;
  name: string;
  lang: string;
  subscription: Subscription;
  devices: { devices: OverviewDevice[]; total: number; device_limit: number } | undefined;
  balanceText: string | null;
  /** `null`: реферальная программа выключена, виджет «Друзья» не показываем. */
  referral: OverviewReferral | null;
  onConnect: () => void;
  onDismiss: () => void;
}

function deviceTitle(d: OverviewDevice): string {
  return d.local_name?.trim() || d.device_model || d.platform;
}

/**
 * Обзор панели: блок «Давайте подключим VPN» (если устройств ещё нет), ряд из четырёх виджетов
 * (подписка, трафик, устройства, баланс), ряд из двух (мои устройства, друзья) и блок помощи.
 * Виджет «Серверы» и график трафика не делаем: в API кабинета для них нет данных.
 */
export default function OverviewWidgets({
  state,
  name,
  lang,
  subscription: sub,
  devices,
  balanceText,
  referral,
  onConnect,
  onDismiss,
}: OverviewProps) {
  const { t } = useTranslation();
  const expired = state === 'renew';
  const total = devices?.total ?? 0;
  const limit = devices?.device_limit ?? sub.device_limit;
  const free = Math.max(0, limit - total);
  const unlimited = !(sub.traffic_limit_gb > 0);
  const ago = daysSince(sub.end_date);
  const until = longDate(sub.end_date, lang);

  const devicesSub =
    total === 0
      ? t('origami.overview.devicesNone')
      : limit > 0 && free === 0
        ? t('origami.overview.devicesFull')
        : t('origami.overview.devicesFree', { count: free });

  return (
    <div className="og og-wide">
      <div className="og-eyebrow">
        {name ? t('origami.overview.eyebrow', { name }) : t('origami.overview.eyebrowNoName')}
      </div>
      <h1 className="og-h1 og-h1-panel">{t('origami.overview.title')}</h1>

      {state === 'wizard' && (
        <section
          className="og-plate og-plate-fold og-pad og-connect-banner"
          data-testid="connect-banner"
        >
          <div className="og-eyebrow">{t('origami.overview.connect.eyebrow')}</div>
          <h2 className="og-h2 og-banner-title">{t('origami.overview.connect.title')}</h2>
          <p className="og-sm">{t('origami.overview.connect.text')}</p>
          <div className="og-row og-row-start" style={{ marginTop: 16, gap: 20 }}>
            <button type="button" className="og-btn og-btn-lg og-banner-btn" onClick={onConnect}>
              <PlusIcon className="h-5 w-5" />
              {t('origami.overview.connect.button')}
            </button>
            <button type="button" className="og-link" onClick={onDismiss}>
              {t('origami.wizard.dismiss')}
            </button>
          </div>
        </section>
      )}

      <div className="og-grid4">
        <section className="og-w og-w-wide" data-testid="widget-subscription">
          <div className="og-w-head">
            <span className="og-eyebrow">{t('origami.overview.subscription')}</span>
            {expired ? (
              <span className="og-tag og-tag-warn">
                {ago === null
                  ? t('origami.renew.expiredNoDate')
                  : t('origami.renew.expired', { when: relativeDaysAgo(ago, lang) })}
              </span>
            ) : (
              <span className="og-tag og-tag-ok">
                {sub.is_trial ? t('origami.overview.trial') : t('origami.overview.active')}
              </span>
            )}
          </div>
          {expired ? (
            <div className="og-w-val og-w-val-word">{t('origami.overview.expiredTitle')}</div>
          ) : (
            <div className="og-w-val">
              {sub.days_left}
              <small>{t('origami.strip.left_unit')}</small>
            </div>
          )}
          <div className="og-sm">
            {[!expired && until ? t('origami.summary.until', { date: until }) : '', sub.tariff_name]
              .filter(Boolean)
              .join(', ')}
          </div>
          <Link
            to={`/subscriptions/${sub.id}/renew`}
            className="og-btn og-btn-sm og-btn-block og-w-btn"
          >
            {t('origami.overview.extend')}
          </Link>
          {expired && (
            <Link to="/subscription/purchase" className="og-link og-w-link">
              {t('origami.overview.changePlan')}
            </Link>
          )}
        </section>

        <section className="og-w og-w-wide" data-testid="widget-traffic">
          <div className="og-w-head">
            <span className="og-eyebrow">{t('origami.overview.traffic')}</span>
          </div>
          <div className="og-w-val">
            {unlimited ? '∞' : sub.traffic_used_gb.toFixed(1)}
            {!unlimited && (
              <small>
                / {sub.traffic_limit_gb} {t('common.units.gb')}
              </small>
            )}
          </div>
          {!unlimited && (
            <div className="og-meter" role="presentation">
              <i style={{ width: `${trafficPercent(sub)}%` }} />
            </div>
          )}
          <div className="og-sm">
            {unlimited
              ? t('origami.summary.unlimited')
              : t('origami.overview.trafficUsed', { pct: trafficPercent(sub) })}
          </div>
        </section>

        <section
          className={`og-w ${state === 'wizard' ? 'og-w-hot' : ''}`}
          data-testid="widget-devices"
        >
          <div className="og-w-head">
            <span className="og-eyebrow">{t('origami.overview.devices')}</span>
          </div>
          <div className="og-w-val">
            {total}
            {limit > 0 && <small>{t('origami.overview.of', { limit })}</small>}
          </div>
          <div className="og-sm">{devicesSub}</div>
          <button
            type="button"
            className="og-btn og-btn-sm og-btn-block og-btn-ghost og-w-btn"
            onClick={onConnect}
          >
            <PlusIcon className="h-5 w-5" />
            {t('origami.overview.connect.short')}
          </button>
        </section>

        <section className="og-w" data-testid="widget-balance">
          <div className="og-w-head">
            <span className="og-eyebrow">{t('origami.overview.balance')}</span>
          </div>
          <div className="og-w-val og-w-val-text">{balanceText ?? '-'}</div>
          <Link
            to="/balance/top-up"
            className="og-btn og-btn-sm og-btn-block og-btn-ghost og-w-btn"
          >
            {t('origami.overview.topup')}
          </Link>
        </section>
      </div>

      <div className={`og-grid2 ${referral ? '' : 'og-grid2-one'}`}>
        <section className="og-w" data-testid="widget-my-devices">
          <div className="og-w-head">
            <span className="og-eyebrow">{t('origami.overview.myDevices')}</span>
            <Link to="/subscriptions" className="og-link og-w-all">
              {t('origami.overview.all')}
            </Link>
          </div>
          {devices && devices.devices.length > 0 ? (
            devices.devices.slice(0, 4).map((d) => (
              <div className="og-dev" key={d.hwid}>
                <div className="og-dev-ico" aria-hidden="true">
                  {deviceTitle(d).charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <b style={{ overflowWrap: 'anywhere' }}>{deviceTitle(d)}</b>
                  <div className="og-sm">
                    {[d.platform, longDate(d.created_at, lang)].filter(Boolean).join(', ')}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="og-sm" style={{ marginTop: 10 }}>
              {total === 0 ? t('origami.overview.devicesNone') : t('origami.summary.noDevices')}
            </p>
          )}
        </section>

        {referral && (
          <section className="og-w" data-testid="widget-friends">
            <div className="og-w-head">
              <span className="og-eyebrow">{t('origami.overview.friends')}</span>
            </div>
            <div className="og-w-val">
              {referral.total}
              <small>{t('origami.overview.friendsActive', { count: referral.active })}</small>
            </div>
            <div className="og-sm">
              {t('origami.overview.friendsEarned', {
                earned: referral.earnedText,
                percent: referral.percent,
              })}
            </div>
            <Link to="/referral" className="og-btn og-btn-sm og-btn-block og-btn-ghost og-w-btn">
              {t('origami.overview.invite')}
            </Link>
          </section>
        )}
      </div>

      <HelpBlock
        title={state === 'renew' ? t('origami.renew.helpTitle') : t('origami.summary.helpTitle')}
        text={state === 'renew' ? t('origami.renew.helpText') : t('origami.summary.helpText')}
        button={t('origami.summary.helpButton')}
      />
    </div>
  );
}
