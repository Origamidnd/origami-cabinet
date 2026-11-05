import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { subscriptionApi } from '@/api/subscription';
import { usePlatform } from '@/platform';
import { copyToClipboard } from '@/utils/clipboard';
import { appId, localized, recommendedApp } from '../connect/connectModel';
import { appIconSvg } from '../connect/appIcon';
import { useConnect } from '../connect/useConnect';
import { useWizardProgress } from '../wizard/useWizardProgress';
import ConnectPageView, { type ConnectState } from './ConnectPageView';

const POLL_INTERVAL_MS = 4000;
const POLL_LIMIT_MS = 150_000;

/**
 * Экран «Подключить устройство» с данными: платформа и рекомендуемое приложение из `useConnect`,
 * шаг из `useWizardProgress`, опрос списка устройств после «Добавить в приложение».
 */
export default function PanelConnect({
  onBack,
  onDone,
}: {
  onBack: () => void;
  onDone: () => void;
}) {
  const { i18n } = useTranslation();
  const { capabilities, backButton } = usePlatform();
  const { progress, update } = useWizardProgress();
  const connect = useConnect();
  // Шаг считаем заново на каждое открытие и выбор: прошлое устройство не должно отмечать галочками новое.
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [added, setAdded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [copied, setCopied] = useState(false);

  // Системная «Назад» Telegram возвращает туда, откуда пришли.
  useEffect(() => {
    if (!capabilities.hasBackButton) return;
    backButton.show(onBack);
    return () => backButton.hide();
  }, [backButton, capabilities.hasBackButton, onBack]);

  // После «Добавить»: ждём, пока число устройств вырастет относительно момента открытия экрана.
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
  const connectState: ConnectState = connected
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

  const recommended =
    connect.platform !== null ? recommendedApp(connect.platform, connect.apps)?.name : undefined;

  const startWaiting = () => {
    setAdded(true);
    setTimedOut(false);
    setStep(3);
    update({ step: 3 });
  };
  const restart = () => {
    setAdded(false);
    setTimedOut(false);
    setStep(1);
  };

  return (
    <ConnectPageView
      onBack={onBack}
      onDone={onDone}
      configured={connect.configured}
      platforms={connect.platforms.map((key) => ({
        key,
        label: platformLabel(key),
        selected: key === connect.platform,
      }))}
      onPlatform={(key) => {
        connect.setPlatform(key);
        restart();
      }}
      apps={connect.apps
        .map((app) => ({
          name: app.name,
          recommended: app.name === recommended,
          icon: appIconSvg(app.svgIconKey, connect.config?.svgLibrary),
          selected: connect.app?.name === app.name,
        }))
        // рекомендуемое приложение первым, остальные в порядке проекта
        .sort((a, b) => Number(b.recommended) - Number(a.recommended))}
      onApp={(name) => {
        const app = connect.apps.find((a) => a.name === name);
        if (app) update({ appId: appId(app) });
        restart();
      }}
      appName={connect.app?.name ?? ''}
      step={step}
      installLinks={connect.installLinks}
      installText={connect.installText}
      onInstall={() => {
        setStep((cur) => (cur > 2 ? cur : 2));
        update({ step: Math.max(progress.step, 2) as 2 | 3 });
      }}
      canAdd={connect.canAddByButton}
      onAdd={() => {
        if (connect.addSubscription()) startWaiting();
      }}
      addHelp={connect.addHelp}
      connectState={connectState}
      qrUrl={connect.qrUrl}
      hideLink={connect.hideLink}
      copied={copied}
      onCopy={async () => {
        if (!connect.qrUrl) return;
        await copyToClipboard(connect.qrUrl);
        // Приложение без кнопки: копирование и есть шаг 2, дальше ждём устройство.
        if (!connect.canAddByButton) startWaiting();
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }}
    />
  );
}
