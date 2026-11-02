import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { subscriptionApi } from '@/api/subscription';
import { copyToClipboard } from '@/utils/clipboard';
import { openAppScheme } from '@/utils/openAppScheme';
import { registerOrigamiLocales } from '../i18n';
import '../styles/origami.css';

registerOrigamiLocales();

const CLIENT_DOWNLOAD_URL = 'https://github.com/Origamidnd/origami-client/releases/latest';

/**
 * Deep link understood by the OrigamiVPN desktop client (`origamivpn://install-config`).
 * The client reads everything after `url=` as the address, so `url` must be the last parameter.
 */
export function buildClientLink(subscriptionUrl: string): string {
  return `origamivpn://install-config?name=OrigamiVPN&url=${encodeURIComponent(subscriptionUrl)}`;
}

/**
 * Страница для десктопного клиента OrigamiVPN: клиент открывает её в браузере, человек входит как
 * обычно (Telegram или почта), а страница возвращает подписку в приложение ссылкой origamivpn://.
 */
export default function AppLink() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const openedRef = useRef(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['connectionLink', undefined],
    queryFn: () => subscriptionApi.getConnectionLink(),
    retry: false,
    staleTime: 30_000,
  });

  const subscriptionUrl = data?.subscription_url ?? null;
  const clientLink = subscriptionUrl ? buildClientLink(subscriptionUrl) : null;

  // One automatic attempt; browsers may still ask before opening the app.
  useEffect(() => {
    if (!clientLink || openedRef.current) return;
    openedRef.current = true;
    openAppScheme(clientLink);
  }, [clientLink]);

  const copy = async () => {
    if (!subscriptionUrl) return;
    await copyToClipboard(subscriptionUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="og og-applink">
      <section className="og-plate og-pad og-plate-fold">
        <div className="og-eyebrow">OrigamiVPN</div>
        {isLoading ? (
          <div className="og-row og-row-start" style={{ gap: 14, marginTop: 12 }}>
            <span className="og-spin" aria-hidden="true" />
            <span className="og-sm">{t('origami.applink.loading')}</span>
          </div>
        ) : clientLink ? (
          <>
            <h1 className="og-h1">{t('origami.applink.title')}</h1>
            <p className="og-sm" style={{ marginTop: 8 }}>
              {t('origami.applink.text')}
            </p>
            <button
              type="button"
              className="og-btn og-btn-lg"
              style={{ marginTop: 20, width: '100%' }}
              onClick={() => openAppScheme(clientLink)}
            >
              {t('origami.applink.open')}
            </button>
            <p className="og-sm" style={{ marginTop: 16 }}>
              {t('origami.applink.notOpened')}
            </p>
            <div className="og-row og-row-start" style={{ gap: 8, marginTop: 10 }}>
              <button type="button" className="og-btn og-btn-sm og-btn-flat" onClick={copy}>
                {copied ? t('origami.applink.copied') : t('origami.applink.copy')}
              </button>
              <a
                className="og-btn og-btn-sm og-btn-flat"
                href={CLIENT_DOWNLOAD_URL}
                target="_blank"
                rel="noreferrer"
              >
                {t('origami.applink.download')}
              </a>
            </div>
          </>
        ) : (
          <>
            <h1 className="og-h1">
              {isError ? t('origami.applink.errorTitle') : t('origami.applink.noSubTitle')}
            </h1>
            <p className="og-sm" style={{ marginTop: 8 }}>
              {isError ? t('origami.applink.errorText') : t('origami.applink.noSubText')}
            </p>
            <Link
              to="/subscription/purchase"
              className="og-btn og-btn-lg"
              style={{ marginTop: 20, width: '100%' }}
            >
              {t('origami.applink.buy')}
            </Link>
          </>
        )}
      </section>
      <p className="og-sm" style={{ marginTop: 14, textAlign: 'center' }}>
        <Link to="/">{t('origami.applink.toCabinet')}</Link>
      </p>
    </div>
  );
}
