import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { LogoutIcon } from '@/components/icons';
import { registerOrigamiLocales } from '../i18n';
import PanelIconView from './PanelIcon';
import { isPanelItemActive, type PanelNavItem } from './panelNav';

registerOrigamiLocales();

export interface PanelSidebarProps {
  pathname: string;
  appName: string;
  logoLetter: string;
  logoUrl: string | null;
  hasCustomLogo: boolean;
  primary: PanelNavItem[];
  secondary: PanelNavItem[];
  isAdmin: boolean;
  /** Текст баланса уже отформатирован (валюта по языку), `null` пока не загружен. */
  balanceText: string | null;
  canToggleTheme: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
  canLogout: boolean;
  onLogout: () => void;
  notifications?: ReactNode;
  language?: ReactNode;
}

/** Боковая колонка панели (ПК): логотип, разделы, внизу баланс, тема, уведомления, язык, выход. */
export default function PanelSidebar({
  pathname,
  appName,
  logoLetter,
  logoUrl,
  hasCustomLogo,
  primary,
  secondary,
  isAdmin,
  balanceText,
  canToggleTheme,
  isDark,
  onToggleTheme,
  canLogout,
  onLogout,
  notifications,
  language,
}: PanelSidebarProps) {
  const { t } = useTranslation();
  const link = (item: PanelNavItem) => {
    const active = isPanelItemActive(pathname, item);
    return (
      <Link
        key={item.key}
        to={item.path}
        className={`og-side-link ${active ? 'og-side-link-on' : ''}`}
        aria-current={active ? 'page' : undefined}
        data-key={item.key}
      >
        <PanelIconView name={item.icon} />
        <span>{t(item.labelKey)}</span>
      </Link>
    );
  };

  return (
    <aside className="og-side" aria-label={t('origami.panel.navigation')}>
      <Link to="/" className="og-logo og-side-logo">
        <span className="og-logo-mark">
          {hasCustomLogo && logoUrl ? <img src={logoUrl} alt={appName || 'Logo'} /> : logoLetter}
        </span>
        {appName && <span className="og-logo-name">{appName}</span>}
      </Link>

      <nav className="og-side-nav">{primary.map(link)}</nav>
      {(secondary.length > 0 || isAdmin) && (
        <nav className="og-side-nav og-side-nav-2">
          {secondary.map(link)}
          {isAdmin && (
            <Link
              to="/admin"
              className={`og-side-link og-side-link-admin ${pathname.startsWith('/admin') ? 'og-side-link-on' : ''}`}
              data-key="admin"
            >
              <PanelIconView name="info" />
              <span>{t('admin.nav.title')}</span>
            </Link>
          )}
        </nav>
      )}

      <div className="og-side-spacer" />

      <div className="og-side-balance">
        <div className="og-eyebrow">{t('origami.panel.balance')}</div>
        <div className="og-side-balance-v">{balanceText ?? '-'}</div>
        <Link to="/balance/top-up" className="og-btn og-btn-sm og-btn-block">
          {t('origami.panel.topup')}
        </Link>
      </div>

      <div className="og-side-tools">
        {canToggleTheme && (
          <button
            type="button"
            className="og-theme-btn og-side-theme"
            onClick={onToggleTheme}
            aria-label={isDark ? t('theme.light') : t('theme.dark')}
          >
            {t('origami.shell.theme')}
          </button>
        )}
        {notifications}
        {language}
        {canLogout && (
          <button
            type="button"
            className="og-icon-btn"
            onClick={onLogout}
            aria-label={t('nav.logout')}
            title={t('nav.logout')}
          >
            <LogoutIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </aside>
  );
}
