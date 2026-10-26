import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { Link, useNavigate } from 'react-router';
import { subscriptionApi } from '@/api/subscription';
import { usePlatform } from '@/platform';
import { copyToClipboard } from '@/utils/clipboard';
import { appId, findAddLink, localized, recommendedApp } from '../connect/connectModel';
import { useConnect } from '../connect/useConnect';
import { registerOrigamiLocales } from '../i18n';
import { useWizardProgress } from '../wizard/useWizardProgress';
import '../styles/origami.css';

registerOrigamiLocales();

const POLL_INTERVAL_MS = 4000;

/**
 * Экран «Добавить устройство» (шаг 2 мастера в полном виде): платформа определена по User-Agent,
 * приложение выбрано рекомендуемое, внизу одна главная кнопка. QR и ссылка нужны для другого устройства.
 */
export default function AddDevice() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { capabilities, backButton } = usePlatform();
  const { update } = useWizardProgress();
  const connect = useConnect();
  const appName = connect.app?.name ?? '';

  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Системная «Назад» Telegram возвращает на главную.
  const back = useCallback(() => navigate('/'), [navigate]);
  useEffect(() => {
    if (!capabilities.hasBackButton) return;
    backButton.show(back);
    return () => backButton.hide();
  }, [backButton, capabilities.hasBackButton, back]);

  // После нажатия «Добавить»: ждём, пока число устройств вырастет относительно момента открытия экрана.
  const baseline = useRef<number | null>(null);
  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => subscriptionApi.getDevices(),
    refetchInterval: added ? POLL_INTERVAL_MS : false,
    staleTime: 0,
  });
  useEffect(() => {
    if (baseline.current === null && devices) baseline.current = devices.total;
  }, [devices]);
  const connected =
    added && devices !== undefined && baseline.current !== null && devices.total > baseline.current;

  const onAdd = () => {
    if (connect.addSubscription()) {
      setAdded(true);
      update({ step: 3 });
    }
  };

  const onCopy = async () => {
    if (!connect.qrUrl) return;
    await copyToClipboard(connect.qrUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const platformName = (key: string) =>
    localized(connect.config?.platforms[key]?.displayName, i18n.language) ||
    localized(connect.config?.platformNames?.[key], i18n.language) ||
    key;

  if (!connect.loading && !connect.configured) {
    return (
      <div className="og" style={{ paddingBottom: 40 }}>
        <h1 className="og-h1">{t('origami.add.title')}</h1>
        <div className="og-plate og-pad og-plate-fold" style={{ marginTop: 22 }}>
          <p className="og-sm">{t('origami.wizard.notConfigured')}</p>
          <Link to="/connection" className="og-btn og-btn-lg" style={{ marginTop: 16 }}>
            {t('origami.wizard.openConnection')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="og" style={{ paddingBottom: 120 }}>
      <div className="og-eyebrow">{t('origami.add.step')}</div>
      <h1 className="og-h1">{t('origami.add.title')}</h1>
      <p className="og-sm" style={{ marginTop: 8 }}>
        {t('origami.add.detected')}
      </p>

      <div className="og-chips" role="tablist" aria-label={t('origami.add.platforms')}>
        {connect.platforms.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={key === connect.platform}
            className={`og-chip ${key === connect.platform ? 'og-chip-on' : ''}`}
            onClick={() => connect.setPlatform(key)}
          >
            {platformName(key)}
          </button>
        ))}
      </div>

      <div className="og-eyebrow" style={{ margin: '24px 0 4px' }}>
        {t('origami.add.app')}
      </div>
      <div role="radiogroup" aria-label={t('origami.add.app')}>
        {connect.apps.map((app) => {
          const recommended =
            connect.platform !== null &&
            recommendedApp(connect.platform, connect.apps)?.name === app.name;
          const selected = connect.app?.name === app.name;
          return (
            <button
              key={app.name}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`og-opt ${selected ? 'og-opt-on' : ''}`}
              onClick={() => connect.setApp(app)}
            >
              <span className="og-dev-ico" aria-hidden="true">
                {app.name.charAt(0).toUpperCase()}
              </span>
              <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                <b className="og-opt-name">{app.name}</b>
                {recommended && (
                  <span className="og-tag og-tag-accent">{t('origami.add.recommended')}</span>
                )}
                {findAddLink(app, connect.config?.subscriptionUrl ?? null) && (
                  <span className="og-sm og-opt-sub">{t('origami.add.oneTap')}</span>
                )}
              </span>
              <span className="og-radio" aria-hidden="true" data-on={selected || undefined} />
            </button>
          );
        })}
      </div>

      <section className="og-plate og-pad og-plate-fold" style={{ marginTop: 20 }}>
        <h2 className="og-h2">{t('origami.add.whatHappens')}</h2>
        <p className="og-sm" style={{ marginTop: 8 }}>
          {t('origami.add.whatHappensText', { app: appName })}
        </p>
      </section>

      {added && (
        <div className="og-plate og-pad-sm" style={{ marginTop: 16 }} role="status">
          {connected ? (
            <div className="og-row">
              <b>{t('origami.add.connected')}</b>
              <button type="button" className="og-btn og-btn-sm" onClick={() => navigate('/')}>
                {t('origami.add.done')}
              </button>
            </div>
          ) : (
            <div className="og-row og-row-start" style={{ gap: 14 }}>
              <span className="og-spin" aria-hidden="true" />
              <span className="og-sm">{t('origami.wizard.step3.waiting')}</span>
            </div>
          )}
        </div>
      )}

      {connect.qrUrl && (
        <div className="og-row og-row-start og-qr-row">
          <div className="og-qr" aria-hidden="true">
            <QRCodeSVG value={connect.qrUrl} size={96} level="M" />
          </div>
          <div className="og-sm">{t('origami.add.qrText')}</div>
        </div>
      )}

      <div className="og-row og-row-start" style={{ marginTop: 16, gap: 10 }}>
        {connect.installUrl && (
          <a
            className="og-btn og-btn-sm og-btn-flat"
            href={connect.installUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('origami.add.notInstalled')}
          </a>
        )}
        {connect.qrUrl && !connect.hideLink && (
          <button type="button" className="og-btn og-btn-sm og-btn-flat" onClick={onCopy}>
            {copied ? t('origami.add.copied') : t('origami.add.copy')}
          </button>
        )}
      </div>

      <div className="og-foot">
        <div className="og-foot-in">
          <button type="button" className="og-btn og-btn-ghost" onClick={back}>
            {t('origami.common.back')}
          </button>
          <button
            type="button"
            className="og-btn"
            style={{ flex: 1 }}
            disabled={!connect.app}
            onClick={onAdd}
            data-app={connect.app ? appId(connect.app) : undefined}
          >
            {t('origami.wizard.step2.add', { app: appName })}
          </button>
        </div>
      </div>
    </div>
  );
}
