import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { balanceApi } from '@/api/balance';
import { infoApi } from '@/api/info';
import { themeColorsApi } from '@/api/themeColors';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import TicketNotificationBell from '@/components/TicketNotificationBell';
import { API } from '@/config/constants';
import { useBranding } from '@/hooks/useBranding';
import { useCurrency } from '@/hooks/useCurrency';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useHeaderHeight } from '@/hooks/useHeaderHeight';
import { useTheme } from '@/hooks/useTheme';
import { useHaptic } from '@/platform';
import { useIsTelegram } from '@/platform/hooks/usePlatform';
import { useAuthStore } from '@/store/auth';
import { displayName } from '@/utils/displayName';
import { registerOrigamiLocales } from '../i18n';
import MenuSheet from './MenuSheet';
import PanelBottomNav from './PanelBottomNav';
import PanelSidebar from './PanelSidebar';
import ShellGlobals from './ShellGlobals';
import {
  buildBottomItems,
  buildMoreItems,
  buildSidebarPrimary,
  buildSidebarSecondary,
} from './panelNav';
import { useIsDesktop } from './useIsDesktop';
import '../styles/origami.css';
import '../styles/panel.css';

registerOrigamiLocales();

const MORE_ID = 'og-more';

/**
 * Оболочка панели (концепция 04): на ПК боковая колонка 232 px, на телефоне верхняя полоса с логотипом
 * и «Темой», нижняя панель и лист «Ещё». Уведомления (стоковый колокольчик с тостами) смонтированы в одном
 * месте: в колонке на ПК или в листе «Ещё» на телефоне.
 */
export default function PanelShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const location = useLocation();
  const haptic = useHaptic();
  const isTelegram = useIsTelegram();
  const desktop = useIsDesktop();
  const { toggleTheme, isDark } = useTheme();
  const { appName, logoLetter, hasCustomLogo, logoUrl } = useBranding();
  const flags = useFeatureFlags();
  const { mobileCss, topSafeArea, isMobileFullscreen } = useHeaderHeight();
  const user = useAuthStore((state) => state.user);
  const isAdmin = Boolean(useAuthStore((state) => state.isAdmin));
  const logout = useAuthStore((state) => state.logout);
  const { formatWithCurrency } = useCurrency();

  const { data: enabledThemes } = useQuery({
    queryKey: ['enabled-themes'],
    queryFn: themeColorsApi.getEnabledThemes,
    staleTime: 1000 * 60 * 5,
  });
  const canToggleTheme = Boolean(enabledThemes?.dark && enabledThemes?.light);

  const { data: languages } = useQuery({
    queryKey: ['languages'],
    queryFn: infoApi.getLanguages,
    staleTime: 1000 * 60 * 5,
  });
  const hasLanguages = (languages?.languages?.length ?? 0) > 1;

  const { data: balance } = useQuery({
    queryKey: ['balance'],
    queryFn: balanceApi.getBalance,
    staleTime: API.BALANCE_STALE_TIME_MS,
  });
  const balanceText = balance ? formatWithCurrency(balance.balance_rubles) : null;

  const [moreOpen, setMoreOpen] = useState(false);
  // Смена экрана закрывает лист «Ещё».
  // biome-ignore lint/correctness/useExhaustiveDependencies: путь нужен как триггер
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);
  // При переходе на широкий экран лист не нужен.
  useEffect(() => {
    if (desktop) setMoreOpen(false);
  }, [desktop]);

  const closeMore = useCallback(() => setMoreOpen(false), []);
  const onToggleTheme = () => {
    haptic.impact('light');
    toggleTheme();
  };
  const onLogout = () => {
    setMoreOpen(false);
    haptic.impact('light');
    logout();
  };

  const bell = <TicketNotificationBell isAdmin={location.pathname.startsWith('/admin')} />;
  const language = hasLanguages ? <LanguageSwitcher /> : undefined;
  const handle = user?.username
    ? `@${user.username}`
    : user?.telegram_id
      ? `ID: ${user.telegram_id}`
      : '';

  return (
    <div className="og-panel og-shell min-h-viewport" data-mobile-nav={desktop ? 'off' : 'on'}>
      <ShellGlobals />

      {desktop ? (
        <PanelSidebar
          pathname={location.pathname}
          appName={appName}
          logoLetter={logoLetter}
          logoUrl={logoUrl}
          hasCustomLogo={hasCustomLogo}
          primary={buildSidebarPrimary(flags)}
          secondary={buildSidebarSecondary(flags)}
          isAdmin={isAdmin}
          balanceText={balanceText}
          canToggleTheme={canToggleTheme}
          isDark={isDark}
          onToggleTheme={onToggleTheme}
          canLogout={!isTelegram}
          onLogout={onLogout}
          notifications={bell}
          language={language}
        />
      ) : (
        <>
          <header
            className="og-header"
            style={{
              paddingTop: isMobileFullscreen ? `${topSafeArea}px` : 'env(safe-area-inset-top, 0px)',
            }}
          >
            <div className="og-header-in">
              <Link to="/" className="og-logo">
                <span className="og-logo-mark">
                  {hasCustomLogo && logoUrl ? (
                    <img src={logoUrl} alt={appName || 'Logo'} />
                  ) : (
                    logoLetter
                  )}
                </span>
                {appName && <span className="og-logo-name">{appName}</span>}
              </Link>
              {canToggleTheme && (
                <button
                  type="button"
                  className="og-theme-btn"
                  onClick={onToggleTheme}
                  aria-label={isDark ? t('theme.light') : t('theme.dark')}
                >
                  {t('origami.shell.theme')}
                </button>
              )}
            </div>
          </header>
          <div style={{ height: mobileCss }} />
          <MenuSheet
            id={MORE_ID}
            open={moreOpen}
            onClose={closeMore}
            pathname={location.pathname}
            items={buildMoreItems(flags)}
            isAdmin={isAdmin}
            userName={displayName(user)}
            userHandle={handle}
            canLogout={!isTelegram}
            onLogout={onLogout}
            top={mobileCss}
            bottom="var(--og-bnav-h)"
            notifications={bell}
            language={language}
          />
          <PanelBottomNav
            pathname={location.pathname}
            items={buildBottomItems(flags)}
            moreOpen={moreOpen}
            onToggleMore={() => {
              haptic.impact('light');
              setMoreOpen((open) => !open);
            }}
            moreId={MORE_ID}
            onNavigate={closeMore}
          />
        </>
      )}

      <main className="og-panel-main">
        <div className="og-panel-in mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
