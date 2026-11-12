import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { CheckIcon, CopyIcon, PlusIcon, RefreshIcon } from '@/components/icons';
import type { Subscription } from '@/types';
import { getFlagEmoji } from '@/utils/subscriptionHelpers';
import { formatTraffic } from '@/utils/formatTraffic';
import Twemoji from '@/lib/twemoji';
import { longDate } from '../home/format';
import { registerOrigamiLocales } from '../i18n';
import { ticketState } from './ticketState';

registerOrigamiLocales();

export interface SubscriptionTicketProps {
  subscription: Subscription;
  /** Израсходовано, ГБ: свежие данные после «Обновить» или из подписки. */
  usedGb: number;
  usedPercent: number;
  isUnlimited: boolean;
  /** Учёт трафика на сервере, объём неизвестен: показываем прочерк. */
  unknownTraffic: boolean;
  /** Сводка управляемого учёта (стоковый компонент), под полосой трафика. */
  trafficSummary?: ReactNode;
  onRefreshTraffic: () => void;
  refreshing: boolean;
  refreshCooldown: number;
  connectedDevices: number;
  onConnect: () => void;
  /** Ссылка подписки; null, если её скрывают настройки. */
  connectionUrl: string | null;
  copied: boolean;
  onCopy: () => void;
  /** Тумблер автопродления (стоковый AutopayToggle); null, если он неуместен. */
  autopay: ReactNode;
  /** Другие способы автоплатежа (свёрнуты), под билетом во всю ширину. */
  autopayMethods?: ReactNode;
  /** Показывать ли корешок «Продление»: решает тот же помощник, что и тумблер. */
  showRenewal: boolean;
}

/**
 * Страница подписки в панели: «билет» (остаток срока, корешок с автопродлением за линией перфорации),
 * под ним виджеты трафика и устройств, ссылка и локации. Язык тот же, что у «Обзора»: пластины og-w,
 * надзаголовки, крупные числа узким шрифтом.
 */
export default function SubscriptionTicket(p: SubscriptionTicketProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'ru';
  const sub = p.subscription;
  const st = ticketState(sub);
  const until = longDate(sub.end_date, lang);
  const limit = sub.device_limit;
  const free = limit > 0 ? Math.max(0, limit - p.connectedDevices) : null;
  const servers = sub.servers ?? [];
  const packages = sub.traffic_purchases ?? [];
  const fmt = (gb: number) =>
    gb.toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <div className="og-sub" data-testid="subscription-ticket">
      <section
        className={`og-ticket${p.showRenewal ? '' : ' og-ticket-solo'}${st.urgent || st.expired ? ' og-ticket-hot' : ''}`}
      >
        <div className="og-ticket-main">
          <div className="og-w-head">
            <span className="og-eyebrow">{t('origami.subscriptionPage.left')}</span>
            <span className={`og-tag ${st.tone === 'ok' ? 'og-tag-ok' : 'og-tag-warn'}`}>
              {t(st.tagKey)}
            </span>
          </div>
          {st.expired ? (
            <div className="og-ticket-val og-ticket-val-word">
              {t('origami.subscriptionPage.expiredTitle')}
            </div>
          ) : (
            <div className="og-ticket-val" data-testid="ticket-days">
              {st.amount}
              <small>
                {t(
                  st.unit === 'h'
                    ? 'origami.subscriptionPage.hoursUnit'
                    : 'origami.subscriptionPage.daysUnit',
                )}
              </small>
            </div>
          )}
          {until && (
            <div className="og-sm">
              {st.expired
                ? t('origami.subscriptionPage.expiredOn', { date: until })
                : t('origami.subscriptionPage.until', { date: until })}
            </div>
          )}
        </div>
        {p.showRenewal && (
          <div className="og-ticket-stub">
            <span className="og-eyebrow">{t('origami.subscriptionPage.renewal')}</span>
            <div className="og-ticket-autopay">{p.autopay}</div>
            <p className="og-ticket-note">{t('origami.subscriptionPage.renewalNote')}</p>
          </div>
        )}
      </section>
      {p.autopayMethods}

      <div className="og-grid2">
        <section className={`og-w${sub.is_limited ? ' og-w-hot' : ''}`} data-testid="sub-traffic">
          <div className="og-w-head">
            <span className="og-eyebrow">{t('origami.subscriptionPage.traffic')}</span>
            <button
              type="button"
              className="og-sub-refresh"
              onClick={p.onRefreshTraffic}
              disabled={p.refreshing || p.refreshCooldown > 0}
            >
              <RefreshIcon className="h-3.5 w-3.5" spinning={p.refreshing} />
              {p.refreshCooldown > 0
                ? t('origami.subscriptionPage.refreshIn', { s: p.refreshCooldown })
                : t('origami.subscriptionPage.refresh')}
            </button>
          </div>
          <div className="og-w-val">
            {p.unknownTraffic ? '—' : fmt(p.usedGb)}
            {!p.unknownTraffic && (
              <small>
                {p.isUnlimited ? t('common.units.gb') : `/ ${formatTraffic(sub.traffic_limit_gb)}`}
              </small>
            )}
          </div>
          {p.isUnlimited ? (
            <div className="og-meter og-meter-free" role="presentation" />
          ) : (
            !p.unknownTraffic && (
              <div className="og-meter" role="presentation">
                <i style={{ width: `${Math.min(100, Math.max(0, p.usedPercent))}%` }} />
              </div>
            )
          )}
          <div className="og-sm">
            {[
              p.isUnlimited
                ? t('origami.subscriptionPage.unlimited')
                : p.unknownTraffic
                  ? ''
                  : t('origami.subscriptionPage.used', { pct: Math.round(p.usedPercent) }),
              sub.traffic_reset_mode && sub.traffic_reset_mode !== 'NO_RESET'
                ? t(`subscription.trafficReset.${sub.traffic_reset_mode}`).toLowerCase()
                : '',
            ]
              .filter(Boolean)
              .join(', ')}
          </div>
          {p.trafficSummary}
        </section>

        <section className="og-w" data-testid="sub-devices">
          <div className="og-w-head">
            <span className="og-eyebrow">{t('origami.subscriptionPage.devices')}</span>
            <Link to="/devices" className="og-link og-w-all">
              {t('origami.subscriptionPage.allDevices')}
            </Link>
          </div>
          <div className="og-w-val">
            {p.connectedDevices}
            <small>
              {limit > 0
                ? t('origami.subscriptionPage.of', { limit })
                : t('origami.subscriptionPage.unlimited')}
            </small>
          </div>
          {limit > 0 && (
            <div className="og-meter" role="presentation">
              <i style={{ width: `${Math.min(100, (p.connectedDevices / limit) * 100)}%` }} />
            </div>
          )}
          {free !== null && (
            <div className="og-sm">
              {free > 0
                ? t('origami.subscriptionPage.free', { count: free })
                : t('origami.subscriptionPage.noFree')}
            </div>
          )}
          {sub.subscription_url && (
            <button
              type="button"
              className="og-btn og-btn-sm og-btn-block og-btn-ghost og-w-btn"
              onClick={p.onConnect}
              disabled={free === 0}
            >
              <PlusIcon className="h-5 w-5" />
              {t('origami.subscriptionPage.connect')}
            </button>
          )}
        </section>
      </div>

      {(p.connectionUrl || servers.length > 0) && (
        <div className={`og-grid2${p.connectionUrl && servers.length > 0 ? '' : ' og-grid2-one'}`}>
          {p.connectionUrl && (
            <section className="og-w" data-testid="sub-link">
              <div className="og-w-head">
                <span className="og-eyebrow">{t('origami.subscriptionPage.link')}</span>
              </div>
              <div className="og-sub-link">
                <code title={p.connectionUrl}>{p.connectionUrl}</code>
                <button
                  type="button"
                  className="og-btn og-btn-sm og-btn-ghost"
                  onClick={p.onCopy}
                  aria-live="polite"
                >
                  {p.copied ? <CheckIcon /> : <CopyIcon />}
                  {p.copied
                    ? t('origami.subscriptionPage.copied')
                    : t('origami.subscriptionPage.copy')}
                </button>
              </div>
              <div className="og-sm">{t('origami.subscriptionPage.linkHint')}</div>
            </section>
          )}
          {servers.length > 0 && (
            <section className="og-w" data-testid="sub-locations">
              <div className="og-w-head">
                <span className="og-eyebrow">{t('origami.subscriptionPage.locations')}</span>
                <span className="og-sm">{servers.length}</span>
              </div>
              <ul className="og-sub-places">
                {servers.map((s) => (
                  <li key={s.uuid}>
                    {s.country_code && <span>{getFlagEmoji(s.country_code)}</span>}
                    <Twemoji
                      tag="span"
                      options={{ className: 'twemoji', folder: 'svg', ext: '.svg' }}
                    >
                      {s.name}
                    </Twemoji>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {packages.length > 0 && (
        <section className="og-w og-sub-block" data-testid="sub-packages">
          <div className="og-w-head">
            <span className="og-eyebrow">{t('origami.subscriptionPage.packages')}</span>
          </div>
          {packages.map((pk) => (
            <div key={pk.id} className="og-sub-pack">
              <div className="og-row">
                <strong>
                  {pk.traffic_gb} {t('common.units.gb')}
                </strong>
                <span className="og-sm">
                  {pk.days_remaining === 0
                    ? t('origami.subscriptionPage.packageExpired')
                    : t('origami.subscriptionPage.packageLeft', {
                        count: pk.days_remaining,
                        date: longDate(pk.expires_at, lang),
                      })}
                </span>
              </div>
              <div className="og-meter" role="presentation">
                <i style={{ width: `${Math.min(100, Math.max(0, pk.progress_percent))}%` }} />
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
