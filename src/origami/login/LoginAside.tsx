import { useTranslation } from 'react-i18next';
import { registerOrigamiLocales } from '../i18n';
import { ORIGAMI_SHELL } from '../shell/config';
import '../styles/origami.css';
import '../styles/panel.css';

registerOrigamiLocales();

const ITEMS = ['status', 'servers', 'devices', 'balance'] as const;

/**
 * Правая колонка входа (концепция 04, «два столбца»): что человек найдёт в кабинете после входа.
 * Только в панели и только на ПК - на телефоне форма входа остаётся одна (скрывает `panel.css`).
 */
export default function OrigamiLoginAside() {
  const { t } = useTranslation();
  if (ORIGAMI_SHELL !== 'panel') return null;
  return (
    <aside className="og og-login-aside" aria-labelledby="og-login-aside-title">
      <div className="og-eyebrow" id="og-login-aside-title">
        {t('origami.login.inside')}
      </div>
      <ul className="og-login-list">
        {ITEMS.map((key) => (
          <li key={key} className="og-plate og-pad">
            <b>{t(`origami.login.${key}.title`)}</b>
            <div className="og-sm">{t(`origami.login.${key}.text`)}</div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
