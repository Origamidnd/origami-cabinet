import { useTranslation } from 'react-i18next';
import { registerOrigamiLocales } from '../i18n';

registerOrigamiLocales();

/** Подпись «Меню» рядом со значком-гамбургером в шапке на телефоне. */
export default function MenuLabel() {
  const { t } = useTranslation();
  return <span className="og-menu-label">{t('origami.common.menu')}</span>;
}
