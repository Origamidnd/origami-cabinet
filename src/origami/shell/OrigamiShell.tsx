import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { infoApi } from '@/api/info';
import { themeColorsApi } from '@/api/themeColors';
import { useBackgroundConsumer } from '@/components/backgrounds/BackgroundHost';
import CampaignBonusNotifier from '@/components/CampaignBonusNotifier';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { PromptDialogHost } from '@/components/PromptDialogHost';
import SuccessNotificationModal from '@/components/SuccessNotificationModal';
import TicketNotificationBell from '@/components/TicketNotificationBell';
import WebSocketNotifications from '@/components/WebSocketNotifications';
import { useBranding } from '@/hooks/useBranding';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useHeaderHeight } from '@/hooks/useHeaderHeight';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { useTheme } from '@/hooks/useTheme';
import { resetVirtualKeyboard } from '@/hooks/useVirtualKeyboard';
import { useHaptic } from '@/platform';
import { useIsTelegram } from '@/platform/hooks/usePlatform';
import { useAuthStore } from '@/store/auth';
import { displayName } from '@/utils/displayName';
import MenuSheet from './MenuSheet';
import OrigamiHeader from './OrigamiHeader';
import { buildMenuItems, isNarrowRoute } from './menuItems';
import '../styles/origami.css';

const MENU_ID = 'og-menu';

/**
 * Оболочка по прототипу 05: шапка (логотип, «Тема», «Меню»), лист «Меню», дальше страница.
 * Вкладок и нижней панели нет. Глобальные компоненты (тосты, окна, веб-сокет) подключены так же,
 * как в стоковой оболочке.
 */
export default function OrigamiShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const haptic = useHaptic();
  const isTelegram = useIsTelegram();
  const { toggleTheme, isDark } = useTheme();
  const { appName, logoLetter, hasCustomLogo, logoUrl } = useBranding();
  const { referralEnabled, wheelEnabled, hasContests, hasPolls, giftEnabled } = useFeatureFlags();
  const { mobileCss, topSafeArea, isMobileFullscreen } = useHeaderHeight();
  const user = useAuthStore((state) => state.user);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const logout = useAuthStore((state) => state.logout);
  useScrollRestoration();
  useBackgroundConsumer();

  const { data: enabledThemes } = useQuery({
    queryKey: ['enabled-themes'],
    queryFn: themeColorsApi.getEnabledThemes,
    staleTime: 1000 * 60 * 5,
  });
  const canToggleTheme = Boolean(enabledThemes?.dark && enabledThemes?.light);

  // Строка «Язык» нужна, только если переключатель что-то покажет (у стокового он без языков не рисуется).
  const { data: languages } = useQuery({
    queryKey: ['languages'],
    queryFn: infoApi.getLanguages,
    staleTime: 1000 * 60 * 5,
  });
  const hasLanguages = (languages?.languages?.length ?? 0) > 1;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Смена экрана закрывает лист и сбрасывает признак «клавиатура открыта» (как в стоковой оболочке).
  // biome-ignore lint/correctness/useExhaustiveDependencies: путь нужен как триггер
  useEffect(() => {
    resetVirtualKeyboard();
    setMenuOpen(false);
  }, [location.pathname]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  const items = buildMenuItems({
    referralEnabled,
    giftEnabled,
    wheelEnabled,
    hasContests,
    hasPolls,
  });
  const handle = user?.username
    ? `@${user.username}`
    : user?.telegram_id
      ? `ID: ${user.telegram_id}`
      : '';

  return (
    <div className="og-shell min-h-viewport" data-mobile-nav="off">
      <WebSocketNotifications />
      <CampaignBonusNotifier />
      <SuccessNotificationModal />
      <PromptDialogHost />

      <OrigamiHeader
        appName={appName}
        logoLetter={logoLetter}
        logoUrl={logoUrl}
        hasCustomLogo={hasCustomLogo}
        canToggleTheme={canToggleTheme}
        isDark={isDark}
        onToggleTheme={() => {
          haptic.impact('light');
          toggleTheme();
        }}
        menuOpen={menuOpen}
        onToggleMenu={() => {
          haptic.impact('light');
          setMenuOpen((open) => !open);
        }}
        onLogoClick={() => setMenuOpen(false)}
        narrow={isNarrowRoute(location.pathname)}
        paddingTop={isMobileFullscreen ? `${topSafeArea}px` : 'env(safe-area-inset-top, 0px)'}
        menuButtonRef={menuButtonRef}
        menuId={MENU_ID}
      />
      <div style={{ height: mobileCss }} />

      <MenuSheet
        id={MENU_ID}
        open={menuOpen}
        onClose={closeMenu}
        pathname={location.pathname}
        items={items}
        isAdmin={Boolean(isAdmin)}
        userName={displayName(user)}
        userHandle={handle}
        canLogout={!isTelegram}
        onLogout={() => {
          setMenuOpen(false);
          haptic.impact('light');
          logout();
        }}
        top={mobileCss}
        notifications={<TicketNotificationBell isAdmin={location.pathname.startsWith('/admin')} />}
        language={hasLanguages ? <LanguageSwitcher /> : undefined}
      />

      <main className="og-main mx-auto max-w-6xl py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] lg:px-6">
        {children}
      </main>
    </div>
  );
}
