import { openLink as sdkOpenLink } from '@telegram-apps/sdk-react';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { subscriptionApi } from '@/api/subscription';
import { useTelegramSDK } from '@/hooks/useTelegramSDK';
import { useAuthStore } from '@/store/auth';
import type { AppConfig, RemnawaveAppClient } from '@/types';
import { isHappCryptolinkMode, resolveConnectionUrlForUi } from '@/utils/connectionLink';
import { openAppScheme } from '@/utils/openAppScheme';
import { hasTemplates, resolveTemplate } from '@/utils/templateEngine';
import { useWizardProgress } from '../wizard/useWizardProgress';
import {
  appId,
  detectPlatform,
  findAddLink,
  findInstall,
  findInstallUrl,
  type InstallLink,
  orderPlatforms,
  recommendedApp,
} from './connectModel';

export interface ConnectModel {
  loading: boolean;
  /** Приложения для подключения настроены в панели (есть хотя бы одна платформа с приложениями). */
  configured: boolean;
  platforms: string[];
  platform: string | null;
  setPlatform: (key: string) => void;
  apps: RemnawaveAppClient[];
  app: RemnawaveAppClient | null;
  setApp: (app: RemnawaveAppClient) => void;
  installUrl: string | null;
  /** Все ссылки установки с подписями и описание шага установки из конфига. */
  installLinks: InstallLink[];
  installText: string;
  /** Адрес для QR и кнопки копирования (учитывает режим Happ cryptolink). */
  qrUrl: string | null;
  hideLink: boolean;
  config: AppConfig | undefined;
  /** Открывает приложение с готовой подпиской. Возвращает false, если ссылки нет. */
  addSubscription: () => boolean;
}

/**
 * Данные шага «добавить подписку»: конфигурация приложений, платформа по User-Agent и рекомендуемое
 * приложение. Запросы идут на тех же ключах, что и стоковая страница подключения (`appConfig`,
 * `connectionLink`), а открытие ссылки повторяет `openDeepLink` из `pages/Connection.tsx`
 * (Mini App открывает через переходник, браузер через `openAppScheme`).
 */
export function useConnect(subscriptionId?: number): ConnectModel {
  const { i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const { isTelegramWebApp } = useTelegramSDK();
  const { progress, update } = useWizardProgress();
  const [platformOverride, setPlatformOverride] = useState<string | null>(null);

  const { data: config, isLoading: configLoading } = useQuery<AppConfig>({
    queryKey: ['appConfig', subscriptionId],
    queryFn: () => subscriptionApi.getAppConfig(subscriptionId),
    staleTime: 60_000,
  });
  const { data: link, isLoading: linkLoading } = useQuery({
    queryKey: ['connectionLink', subscriptionId],
    queryFn: () => subscriptionApi.getConnectionLink(subscriptionId),
    retry: false,
    staleTime: 30_000,
  });

  const platforms = useMemo(
    () =>
      orderPlatforms(
        config?.platforms,
        detectPlatform(typeof navigator === 'undefined' ? null : navigator.userAgent),
      ),
    [config?.platforms],
  );
  const platform =
    platformOverride && platforms.includes(platformOverride)
      ? platformOverride
      : (platforms[0] ?? null);

  const apps = useMemo(
    () => (platform ? (config?.platforms[platform]?.apps ?? []) : []),
    [config?.platforms, platform],
  );
  const app = platform ? recommendedApp(platform, apps, progress.appId) : null;
  const installUrl = findInstallUrl(app);
  const install = findInstall(app, i18n.language);

  const qrUrl = useMemo(
    () =>
      resolveConnectionUrlForUi({
        mode: link?.connect_mode,
        happSchemeLink: link?.happ_scheme_link,
        displayLink: link?.display_link,
        subscriptionUrl: link?.subscription_url,
        happCryptLink: link?.happ_cryptolink,
        happCryptoLink: link?.happ_crypto_link,
        happLink: link?.happ_link,
        fallbackUrl: config?.subscriptionUrl,
      }),
    [config?.subscriptionUrl, link],
  );

  const openDeepLink = useCallback(
    (deepLink: string) => {
      let resolved = deepLink;
      if (hasTemplates(resolved) && config?.subscriptionUrl) {
        resolved = resolveTemplate(resolved, {
          subscriptionUrl: config.subscriptionUrl,
          username: user?.username ?? undefined,
        });
      }
      // В режиме Happ cryptolink открытую ссылку подписки не показываем: берём зашифрованную.
      if (
        isHappCryptolinkMode(link?.connect_mode) &&
        qrUrl &&
        (!resolved || resolved === config?.subscriptionUrl || hasTemplates(resolved))
      ) {
        resolved = qrUrl;
      }
      const isHttp = /^https?:\/\//i.test(resolved);
      const forTelegram = isHttp
        ? resolved
        : `${window.location.origin}/miniapp/redirect.html?url=${encodeURIComponent(resolved)}&lang=${i18n.language || 'en'}`;
      if (isTelegramWebApp) {
        try {
          sdkOpenLink(forTelegram, { tryInstantView: false });
          return;
        } catch {
          // SDK недоступен, открываем как в браузере
        }
      }
      openAppScheme(resolved);
    },
    [
      config?.subscriptionUrl,
      i18n.language,
      isTelegramWebApp,
      link?.connect_mode,
      qrUrl,
      user?.username,
    ],
  );

  const addSubscription = useCallback(() => {
    const url = findAddLink(app, config?.subscriptionUrl ?? null, user?.username ?? undefined);
    if (!url) return false;
    openDeepLink(url);
    return true;
  }, [app, config?.subscriptionUrl, openDeepLink, user?.username]);

  return {
    loading: configLoading || linkLoading,
    configured: platforms.length > 0,
    platforms,
    platform,
    setPlatform: setPlatformOverride,
    apps,
    app,
    setApp: (next) => update({ appId: appId(next) }),
    installUrl,
    installLinks: install.links,
    installText: install.text,
    qrUrl,
    hideLink: link?.hide_link ?? config?.hideLink ?? false,
    config,
    addSubscription,
  };
}
