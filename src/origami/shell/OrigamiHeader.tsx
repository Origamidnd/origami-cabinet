import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { CloseIcon, MenuIcon } from '@/components/icons';
import { registerOrigamiLocales } from '../i18n';

registerOrigamiLocales();

export interface OrigamiHeaderProps {
  appName: string;
  logoLetter: string;
  logoUrl: string | null;
  hasCustomLogo: boolean;
  /** Показывать переключатель темы (включены обе темы). */
  canToggleTheme: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onLogoClick?: () => void;
  /** Шапка стоит над узкой колонкой (главная, подключение). */
  narrow?: boolean;
  /** Верхний отступ под статус-бар или шапку Telegram. */
  paddingTop?: string;
  menuButtonRef?: React.Ref<HTMLButtonElement>;
  menuId: string;
}

/**
 * Шапка по прототипу 05: логотип слева, справа «Тема» и «Меню». Вкладок и значков нет:
 * разделы, уведомления, профиль и выход живут в листе «Меню».
 */
export default function OrigamiHeader({
  appName,
  logoLetter,
  logoUrl,
  hasCustomLogo,
  canToggleTheme,
  isDark,
  onToggleTheme,
  menuOpen,
  onToggleMenu,
  onLogoClick,
  narrow,
  paddingTop,
  menuButtonRef,
  menuId,
}: OrigamiHeaderProps) {
  const { t } = useTranslation();
  const themeLabel = isDark ? t('theme.light') : t('theme.dark');

  return (
    <header className="og-header" style={paddingTop ? { paddingTop } : undefined}>
      <div className={`og-header-in ${narrow ? 'og-header-narrow' : ''}`}>
        <Link to="/" className="og-logo" onClick={onLogoClick}>
          <span className="og-logo-mark">
            {hasCustomLogo && logoUrl ? <img src={logoUrl} alt={appName || 'Logo'} /> : logoLetter}
          </span>
          {appName && <span className="og-logo-name">{appName}</span>}
        </Link>
        <div className="og-header-actions">
          {canToggleTheme && (
            <button
              type="button"
              className="og-theme-btn"
              onClick={onToggleTheme}
              aria-label={themeLabel}
              title={themeLabel}
            >
              {t('origami.shell.theme')}
            </button>
          )}
          <button
            type="button"
            ref={menuButtonRef}
            className="og-menu-btn"
            onClick={onToggleMenu}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? t('origami.shell.closeMenu') : t('origami.shell.openMenu')}
          >
            {menuOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
            <span>{t('origami.common.menu')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
