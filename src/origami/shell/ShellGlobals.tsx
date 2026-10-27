import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useBackgroundConsumer } from '@/components/backgrounds/BackgroundHost';
import CampaignBonusNotifier from '@/components/CampaignBonusNotifier';
import { PromptDialogHost } from '@/components/PromptDialogHost';
import SuccessNotificationModal from '@/components/SuccessNotificationModal';
import WebSocketNotifications from '@/components/WebSocketNotifications';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { resetVirtualKeyboard } from '@/hooks/useVirtualKeyboard';

/**
 * Глобальные компоненты и хуки, которые стоковая оболочка подключает для любой страницы: тосты и
 * окна, веб-сокет, фон, восстановление прокрутки, сброс признака «клавиатура открыта» при смене экрана.
 */
export default function ShellGlobals() {
  const { pathname } = useLocation();
  useScrollRestoration();
  useBackgroundConsumer();

  // biome-ignore lint/correctness/useExhaustiveDependencies: путь нужен как триггер
  useEffect(() => {
    resetVirtualKeyboard();
  }, [pathname]);

  return (
    <>
      <WebSocketNotifications />
      <CampaignBonusNotifier />
      <SuccessNotificationModal />
      <PromptDialogHost />
    </>
  );
}
