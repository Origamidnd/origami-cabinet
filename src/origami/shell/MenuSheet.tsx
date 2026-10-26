import { type ReactNode, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { ChevronRightIcon, CogIcon, LogoutIcon } from '@/components/icons';
import { registerOrigamiLocales } from '../i18n';
import { isMenuItemActive, type MenuItem } from './menuItems';

registerOrigamiLocales();

export interface MenuSheetProps {
  id: string;
  open: boolean;
  onClose: () => void;
  pathname: string;
  items: MenuItem[];
  isAdmin: boolean;
  userName: string;
  userHandle: string;
  /** Выход есть только в браузере: в Telegram вход идёт по initData. */
  canLogout: boolean;
  onLogout: () => void;
  /** Верхний отступ листа (высота шапки). */
  top: string;
  /** Колокольчик уведомлений: стоковый компонент должен быть смонтирован всегда, он показывает тосты. */
  notifications?: ReactNode;
  language?: ReactNode;
}

/**
 * Лист «Меню». Всегда в DOM (внутри живёт стоковый колокольчик с тостами), в закрытом виде скрыт.
 * Закрывается по Esc, по повторному нажатию на кнопку, при смене маршрута и по клику на пункт.
 */
export default function MenuSheet({
  id,
  open,
  onClose,
  pathname,
  items,
  isAdmin,
  userName,
  userHandle,
  canLogout,
  onLogout,
  top,
  notifications,
  language,
}: MenuSheetProps) {
  const { t } = useTranslation();
  const firstRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    // Прокрутка страницы под листом заблокирована, внутри листа прокручивается свой блок.
    const prevBody = document.body.style.overflow;
    const prevRoot = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    firstRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevRoot;
    };
  }, [open, onClose]);

  return (
    <div
      id={id}
      className="og-sheet"
      style={{ top }}
      hidden={!open}
      role="dialog"
      aria-label={t('origami.common.menu')}
    >
      <div className="og-sheet-scroll">
        <div className="og-sheet-in">
          {userName && (
            <div className="og-sheet-user">
              <span className="og-dev-ico" aria-hidden="true">
                {userName.charAt(0).toUpperCase()}
              </span>
              <div style={{ minWidth: 0 }}>
                <div className="og-sheet-name">{userName}</div>
                {userHandle && <div className="og-sm">{userHandle}</div>}
              </div>
            </div>
          )}

          <nav className="og-sheet-nav" aria-label={t('origami.common.menu')}>
            {items.map((item, index) => {
              const active = isMenuItemActive(pathname, item);
              return (
                <Link
                  key={item.key}
                  to={item.path}
                  ref={index === 0 ? firstRef : undefined}
                  className={`og-menu-item ${active ? 'og-menu-item-on' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={onClose}
                  data-key={item.key}
                >
                  <span>{t(item.labelKey)}</span>
                  <ChevronRightIcon className="h-5 w-5" />
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                to="/admin"
                className={`og-menu-item og-menu-item-admin ${pathname.startsWith('/admin') ? 'og-menu-item-on' : ''}`}
                onClick={onClose}
                data-key="admin"
              >
                <span className="og-menu-icon-row">
                  <CogIcon className="h-5 w-5" />
                  {t('admin.nav.title')}
                </span>
                <ChevronRightIcon className="h-5 w-5" />
              </Link>
            )}
          </nav>

          <div className="og-sheet-extra">
            <div className="og-menu-row">
              <span>{t('origami.shell.notifications')}</span>
              {notifications}
            </div>
            {language && (
              <div className="og-menu-row">
                <span>{t('origami.shell.language')}</span>
                {language}
              </div>
            )}
          </div>

          {canLogout && (
            <button type="button" className="og-menu-item og-menu-item-danger" onClick={onLogout}>
              <span className="og-menu-icon-row">
                <LogoutIcon className="h-5 w-5" />
                {t('nav.logout')}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
