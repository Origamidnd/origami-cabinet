import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { MenuIcon } from '@/components/icons';
import { registerOrigamiLocales } from '../i18n';
import PanelIconView from './PanelIcon';
import { isPanelItemActive, type PanelNavItem } from './panelNav';

registerOrigamiLocales();

export interface PanelBottomNavProps {
  pathname: string;
  items: PanelNavItem[];
  moreOpen: boolean;
  onToggleMore: () => void;
  moreId: string;
  onNavigate?: () => void;
}

/** Нижняя панель на телефоне: четыре раздела и «Ещё» (лист с остальными пунктами). */
export default function PanelBottomNav({
  pathname,
  items,
  moreOpen,
  onToggleMore,
  moreId,
  onNavigate,
}: PanelBottomNavProps) {
  const { t } = useTranslation();
  return (
    <nav className="og-bnav" aria-label={t('origami.panel.navigation')}>
      {items.map((item) => {
        const active = isPanelItemActive(pathname, item) && !moreOpen;
        return (
          <Link
            key={item.key}
            to={item.path}
            className={`og-bnav-item ${active ? 'og-bnav-item-on' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={onNavigate}
            data-key={item.key}
          >
            <PanelIconView name={item.icon} />
            <span>{t(item.labelKey)}</span>
          </Link>
        );
      })}
      <button
        type="button"
        className={`og-bnav-item ${moreOpen ? 'og-bnav-item-on' : ''}`}
        onClick={onToggleMore}
        aria-expanded={moreOpen}
        aria-controls={moreId}
        data-key="more"
      >
        <MenuIcon className="h-5 w-5" />
        <span>{t('origami.panel.more')}</span>
      </button>
    </nav>
  );
}
