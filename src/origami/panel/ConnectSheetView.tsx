import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { CloseIcon } from '@/components/icons';
import { QrZoom } from '../connect/QrZoom';
import { registerOrigamiLocales } from '../i18n';
import { useFocusTrap } from './useFocusTrap';

registerOrigamiLocales();

export interface SheetApp {
  name: string;
  recommended: boolean;
  /** Приложение умеет добавить подписку одной кнопкой (есть ссылка добавления). */
  oneTap: boolean;
  selected: boolean;
}

export type SheetConnectState = 'idle' | 'waiting' | 'connected' | 'slow';

export interface ConnectSheetViewProps {
  onClose: () => void;
  configured: boolean;
  platforms: { key: string; label: string; selected: boolean }[];
  onPlatform: (key: string) => void;
  apps: SheetApp[];
  onApp: (name: string) => void;
  appName: string;
  /** Текущий шаг мастера: 1 - установить, 2 - добавить подписку, 3 - проверить. */
  step: 1 | 2 | 3;
  installUrl: string | null;
  onInstall: () => void;
  canAdd: boolean;
  onAdd: () => void;
  connectState: SheetConnectState;
  qrUrl: string | null;
  hideLink: boolean;
  copied: boolean;
  onCopy: () => void;
}

/**
 * Штора «Подключить устройство» (концепция 04): справа 460 px на ПК, нижний лист на телефоне.
 * Закрывается крестиком, Esc и кликом в затемнение; внутри фокус-ловушка.
 */
export default function ConnectSheetView(props: ConnectSheetViewProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLElement>(null);
  const { onClose, step } = props;
  useFocusTrap(ref, onClose);

  const stepState = (n: 1 | 2 | 3) => (step > n ? 'done' : step === n ? 'cur' : 'todo');

  return (
    <>
      <div
        className="og-drawer-bg"
        onClick={onClose}
        aria-hidden="true"
        data-testid="sheet-backdrop"
      />
      <aside
        ref={ref}
        className="og-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="og-sheet-title"
        tabIndex={-1}
      >
        <div className="og-row">
          <div>
            <div className="og-eyebrow">{t('origami.sheet.eyebrow')}</div>
            <h2 className="og-h2 og-sheet-title" id="og-sheet-title">
              {t('origami.sheet.title')}
            </h2>
          </div>
          <button
            type="button"
            className="og-icon-btn"
            onClick={onClose}
            aria-label={t('origami.sheet.close')}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {!props.configured ? (
          <div className="og-plate og-pad" style={{ marginTop: 18 }}>
            <p className="og-sm">{t('origami.wizard.notConfigured')}</p>
            <Link to="/connection" className="og-btn og-btn-block" style={{ marginTop: 14 }}>
              {t('origami.wizard.openConnection')}
            </Link>
          </div>
        ) : (
          <>
            <p className="og-sm" style={{ marginTop: 12 }}>
              {t('origami.add.detected')}
            </p>
            <div className="og-chips" role="tablist" aria-label={t('origami.add.platforms')}>
              {props.platforms.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  role="tab"
                  aria-selected={p.selected}
                  className={`og-chip ${p.selected ? 'og-chip-on' : ''}`}
                  onClick={() => props.onPlatform(p.key)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div role="radiogroup" aria-label={t('origami.add.app')} style={{ marginTop: 6 }}>
              {props.apps.map((app) => (
                <button
                  key={app.name}
                  type="button"
                  role="radio"
                  aria-checked={app.selected}
                  className={`og-opt ${app.selected ? 'og-opt-on' : ''}`}
                  onClick={() => props.onApp(app.name)}
                >
                  <span className="og-dev-ico" aria-hidden="true">
                    {app.name.charAt(0).toUpperCase()}
                  </span>
                  <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                    <b className="og-opt-name">{app.name}</b>
                    {app.recommended && (
                      <span className="og-tag og-tag-accent">{t('origami.add.recommended')}</span>
                    )}
                    {app.oneTap && (
                      <span className="og-sm og-opt-sub">{t('origami.add.oneTap')}</span>
                    )}
                  </span>
                  <span
                    className="og-radio"
                    aria-hidden="true"
                    data-on={app.selected || undefined}
                  />
                </button>
              ))}
            </div>

            <ol className="og-steps">
              <li className={`og-sstep og-sstep-${stepState(1)}`}>
                <span className="og-snum">{step > 1 ? '✓' : 1}</span>
                <div style={{ flex: 1 }}>
                  <b>{t('origami.sheet.step1.title', { app: props.appName })}</b>
                  <div className="og-sm">{t('origami.sheet.step1.text')}</div>
                  {props.installUrl && (
                    <a
                      className="og-btn og-btn-sm og-btn-ghost"
                      href={props.installUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={props.onInstall}
                    >
                      {t('origami.sheet.step1.button')}
                    </a>
                  )}
                </div>
              </li>
              <li className={`og-sstep og-sstep-${stepState(2)}`}>
                <span className="og-snum">{step > 2 ? '✓' : 2}</span>
                <div style={{ flex: 1 }}>
                  <b>{t('origami.sheet.step2.title')}</b>
                  <div className="og-sm">
                    {t('origami.sheet.step2.text', { app: props.appName })}
                  </div>
                  <button
                    type="button"
                    className="og-btn og-btn-sm"
                    disabled={!props.canAdd}
                    onClick={props.onAdd}
                  >
                    {t('origami.wizard.step2.add', { app: props.appName })}
                  </button>
                </div>
              </li>
              <li className={`og-sstep og-sstep-${stepState(3)}`}>
                <span className="og-snum">3</span>
                <div style={{ flex: 1 }}>
                  <b>{t('origami.sheet.step3.title')}</b>
                  {props.connectState === 'connected' ? (
                    <div className="og-row og-row-start" role="status" style={{ gap: 12 }}>
                      <span className="og-tag og-tag-ok">{t('origami.add.connected')}</span>
                      <button type="button" className="og-btn og-btn-sm" onClick={onClose}>
                        {t('origami.add.done')}
                      </button>
                    </div>
                  ) : props.connectState === 'waiting' ? (
                    <div className="og-row og-row-start" role="status" style={{ gap: 12 }}>
                      <span className="og-spin" aria-hidden="true" />
                      <span className="og-sm">{t('origami.wizard.step3.waiting')}</span>
                    </div>
                  ) : (
                    <div className="og-sm">
                      {props.connectState === 'slow' && `${t('origami.wizard.step3.slow')} `}
                      {t('origami.sheet.step3.text')}{' '}
                      <Link to="/support" className="og-link">
                        {t('origami.wizard.step3.support')}
                      </Link>
                    </div>
                  )}
                </div>
              </li>
            </ol>

            {props.qrUrl && (
              <div className="og-row og-row-start og-qr-row">
                <QrZoom value={props.qrUrl} />
                <div className="og-sm">{t('origami.add.qrText')}</div>
              </div>
            )}
            {props.qrUrl && !props.hideLink && (
              <button
                type="button"
                className="og-btn og-btn-sm og-btn-flat"
                style={{ marginTop: 14 }}
                onClick={props.onCopy}
              >
                {props.copied ? t('origami.add.copied') : t('origami.add.copy')}
              </button>
            )}
          </>
        )}
      </aside>
    </>
  );
}
