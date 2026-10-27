import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { subscriptionApi } from '@/api/subscription';
import { usePlatform } from '@/platform';
import { copyToClipboard } from '@/utils/clipboard';
import { appId, findAddLink, localized, recommendedApp } from '../connect/connectModel';
import { useConnect } from '../connect/useConnect';
import { useWizardProgress } from '../wizard/useWizardProgress';
import ConnectSheetView, { type SheetConnectState } from './ConnectSheetView';

const POLL_INTERVAL_MS = 4000;
const POLL_LIMIT_MS = 150_000;

/**
 * Штора «Подключить устройство» с данными: платформа и рекомендуемое приложение из `useConnect`,
 * шаг и отказ от мастера из `useWizardProgress`, опрос списка устройств после «Добавить в приложение».
 */
export default function PanelConnectSheet({ onClose }: { onClose: () => void }) {
  const { i18n } = useTranslation();
  const { capabilities, backButton } = usePlatform();
  const { progress, update } = useWizardProgress();
  const connect = useConnect();
  const [added, setAdded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [copied, setCopied] = useState(false);

  // Системная «Назад» Telegram закрывает штору.
  useEffect(() => {
    if (!capabilities.hasBackButton) return;
    backButton.show(onClose);
    return () => backButton.hide();
  }, [backButton, capabilities.hasBackButton, onClose]);

  // После «Добавить»: ждём, пока число устройств вырастет относительно момента открытия шторы.
  const baseline = useRef<number | null>(null);
  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => subscriptionApi.getDevices(),
    refetchInterval: added && !timedOut ? POLL_INTERVAL_MS : false,
    staleTime: 0,
  });
  useEffect(() => {
    if (baseline.current === null && devices) baseline.current = devices.total;
  }, [devices]);
  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setTimedOut(true), POLL_LIMIT_MS);
    return () => window.clearTimeout(timer);
  }, [added]);

  const connected = added && baseline.current !== null && (devices?.total ?? 0) > baseline.current;
  const connectState: SheetConnectState = connected
    ? 'connected'
    : added
      ? timedOut
        ? 'slow'
        : 'waiting'
      : 'idle';

  const platformLabel = useCallback(
    (key: string) =>
      localized(connect.config?.platforms[key]?.displayName, i18n.language) ||
      localized(connect.config?.platformNames?.[key], i18n.language) ||
      key,
    [connect.config, i18n.language],
  );

  const subscriptionUrl = connect.config?.subscriptionUrl ?? null;
  const recommended =
    connect.platform !== null ? recommendedApp(connect.platform, connect.apps)?.name : undefined;

  return (
    <ConnectSheetView
      onClose={onClose}
      configured={connect.configured}
      platforms={connect.platforms.map((key) => ({
        key,
        label: platformLabel(key),
        selected: key === connect.platform,
      }))}
      onPlatform={connect.setPlatform}
      apps={connect.apps.map((app) => ({
        name: app.name,
        recommended: app.name === recommended,
        oneTap: findAddLink(app, subscriptionUrl) !== null,
        selected: connect.app?.name === app.name,
      }))}
      onApp={(name) => {
        const app = connect.apps.find((a) => a.name === name);
        if (app) update({ appId: appId(app) });
      }}
      appName={connect.app?.name ?? ''}
      step={progress.step}
      installUrl={connect.installUrl}
      onInstall={() => update({ step: Math.max(progress.step, 2) as 2 | 3 })}
      canAdd={Boolean(connect.app)}
      onAdd={() => {
        if (connect.addSubscription()) {
          setAdded(true);
          setTimedOut(false);
          update({ step: 3 });
        }
      }}
      connectState={connectState}
      qrUrl={connect.qrUrl}
      hideLink={connect.hideLink}
      copied={copied}
      onCopy={async () => {
        if (!connect.qrUrl) return;
        await copyToClipboard(connect.qrUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }}
    />
  );
}
