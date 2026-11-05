import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { BackIcon, CheckIcon, CopyIcon, PlusIcon } from '@/components/icons';
import { QrZoom } from '../connect/QrZoom';
import { registerOrigamiLocales } from '../i18n';

registerOrigamiLocales();

export interface ConnectApp {
  name: string;
  recommended: boolean;
  selected: boolean;
}

export type ConnectState = 'idle' | 'waiting' | 'connected' | 'slow';

export interface ConnectPageViewProps {
  onBack: () => void;
  onDone: () => void;
  configured: boolean;
  platforms: { key: string; label: string; selected: boolean }[];
  onPlatform: (key: string) => void;
  /** Рекомендуемое приложение первым. */
  apps: ConnectApp[];
  onApp: (name: string) => void;
  appName: string;
  /** Текущий шаг: 1 - установить, 2 - добавить подписку, 3 - включить. */
  step: 1 | 2 | 3;
  /** Ссылки установки с подписями из конфига (как на странице подписки). */
  installLinks: { url: string; label: string }[];
  /** Описание шага установки из конфига; пусто - текст по умолчанию. */
  installText: string;
  onInstall: () => void;
  /** Приложение принимает подписку по кнопке; иначе главное действие - скопировать ссылку. */
  canAdd: boolean;
  onAdd: () => void;
  /** Что делать, если кнопка не сработала (из конфига приложения). */
  addHelp: string;
  connectState: ConnectState;
  qrUrl: string | null;
  hideLink: boolean;
  copied: boolean;
  onCopy: () => void;
}

const TILE_HUES = ['#E0702B', '#2A8A5E', '#3D7BD9', '#8A5CD6', '#C77412', '#1F9AA8'];

/** Постоянный цвет плашки приложения: один и тот же при каждом открытии. */
function tileHue(name: string): string {
  let sum = 0;
  for (const ch of name) sum += ch.charCodeAt(0);
  return TILE_HUES[sum % TILE_HUES.length];
}

/**
 * Экран «Подключить устройство»: устройство сверху, слева приложение, справа сразу все шаги.
 * Платформа и приложение уже выбраны, поэтому обычно хватает одной кнопки «Добавить». На телефоне
 * вторичные приложения свёрнуты за строкой «Другие приложения».
 */
export default function ConnectPageView(props: ConnectPageViewProps) {
  const { t } = useTranslation();
  const { step, appName, canAdd, connectState } = props;
  const [showAll, setShowAll] = useState(false);

  const stepClass = (n: 1 | 2 | 3) =>
    `og-cn-step og-cn-step-${step > n ? 'done' : step === n ? 'cur' : 'todo'}`;
  const num = (n: 1 | 2 | 3) => (
    <span className="og-cn-num">{step > n ? <CheckIcon className="h-4 w-4" /> : n}</span>
  );

  const extraCount = props.apps.filter((a) => !a.recommended && !a.selected).length;
  const canCopy = Boolean(props.qrUrl) && !props.hideLink;

  const head = (
    <div className="og-cn-head">
      <button
        type="button"
        className="og-icon-btn og-cn-back"
        onClick={props.onBack}
        aria-label={t('origami.connect.back')}
      >
        <BackIcon className="h-5 w-5" />
      </button>
      <div style={{ minWidth: 0 }}>
        <div className="og-eyebrow">{t('origami.connect.eyebrow')}</div>
        <h1 className="og-h1 og-h1-panel" style={{ marginTop: 0 }}>
          {t('origami.connect.title')}
        </h1>
      </div>
    </div>
  );

  if (!props.configured) {
    return (
      <div className="og og-wide og-cn">
        {head}
        <section className="og-cn-plate" style={{ marginTop: 18 }}>
          <p className="og-sm">{t('origami.connect.notConfigured')}</p>
          <div className="og-cn-btns">
            <Link to="/connection" className="og-btn og-btn-sm">
              {t('origami.connect.open')}
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const copyLabel = props.copied ? t('origami.connect.copied') : t('origami.connect.copy');

  return (
    <div className="og og-wide og-cn">
      {head}

      <div className="og-cn-dev">
        <span className="og-cn-label">{t('origami.connect.device')}</span>
        <span className="og-sm" style={{ fontSize: 12 }}>
          {t('origami.connect.detected')}
        </span>
        <div className="og-cn-seg" role="tablist" aria-label={t('origami.connect.device')}>
          {props.platforms.map((p) => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={p.selected}
              onClick={() => props.onPlatform(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="og-cn-grid">
        <section className="og-cn-plate og-cn-apps">
          <span className="og-cn-label">{t('origami.connect.app')}</span>
          <div role="radiogroup" aria-label={t('origami.connect.app')}>
            {props.apps.map((app) => {
              const extra = !app.recommended && !app.selected;
              return (
                <button
                  key={app.name}
                  type="button"
                  role="radio"
                  aria-checked={app.selected}
                  className={`og-cn-app ${extra ? 'og-cn-extra' : ''} ${showAll ? 'is-open' : ''}`}
                  onClick={() => props.onApp(app.name)}
                >
                  <span
                    className="og-cn-tile"
                    aria-hidden="true"
                    style={{ '--og-tile-hue': tileHue(app.name) } as React.CSSProperties}
                  >
                    {app.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="og-cn-app-name">{app.name}</span>
                  {app.recommended && (
                    <span className="og-cn-rec">{t('origami.add.recommended')}</span>
                  )}
                </button>
              );
            })}
          </div>
          {extraCount > 0 && !showAll && (
            <button type="button" className="og-cn-more" onClick={() => setShowAll(true)}>
              {t('origami.connect.more', { count: extraCount })}
            </button>
          )}
        </section>

        <div className="og-cn-side">
          <ol className="og-cn-plate og-cn-steps">
            <li className={stepClass(1)}>
              {num(1)}
              <div className="og-cn-step-body">
                <b className="og-cn-step-title">{t('origami.connect.step1', { app: appName })}</b>
                <div className="og-sm">{props.installText || t('origami.connect.step1Text')}</div>
                {props.installLinks.length > 0 && (
                  <div className="og-cn-btns" data-testid="install-links">
                    {props.installLinks.map((link) => (
                      <a
                        key={link.url}
                        className="og-btn og-btn-sm og-btn-ghost"
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={props.onInstall}
                      >
                        {link.label || t('origami.sheet.step1.button')}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </li>

            <li className={stepClass(2)}>
              {num(2)}
              <div className="og-cn-step-body">
                <b className="og-cn-step-title">{t('origami.connect.step2')}</b>
                <div className="og-sm">
                  {canAdd
                    ? t('origami.connect.step2Text', { app: appName })
                    : t('origami.connect.step2Manual', { app: appName })}
                </div>
                <div className="og-cn-btns">
                  {canAdd ? (
                    <>
                      <button
                        type="button"
                        className="og-btn og-btn-sm og-cn-add"
                        onClick={props.onAdd}
                      >
                        <PlusIcon className="h-5 w-5" />
                        {t('origami.connect.add', { app: appName })}
                      </button>
                      {canCopy && (
                        <button
                          type="button"
                          className="og-btn og-btn-sm og-btn-ghost"
                          onClick={props.onCopy}
                        >
                          <CopyIcon className="h-4 w-4" />
                          {copyLabel}
                        </button>
                      )}
                    </>
                  ) : (
                    canCopy && (
                      <button
                        type="button"
                        className="og-btn og-btn-sm og-cn-add"
                        onClick={props.onCopy}
                      >
                        <CopyIcon className="h-4 w-4" />
                        {copyLabel}
                      </button>
                    )
                  )}
                </div>
                {canAdd && props.addHelp && (
                  <details className="og-cn-help">
                    <summary>{t('origami.connect.notOpened')}</summary>
                    <p>{props.addHelp}</p>
                  </details>
                )}
              </div>
            </li>

            <li className={stepClass(3)}>
              {num(3)}
              <div className="og-cn-step-body">
                <b className="og-cn-step-title">{t('origami.connect.step3')}</b>
                {connectState === 'connected' ? (
                  <div className="og-cn-status" role="status">
                    <span className="og-tag og-tag-ok">{t('origami.connect.connected')}</span>
                    <button type="button" className="og-btn og-btn-sm" onClick={props.onDone}>
                      {t('origami.connect.done')}
                    </button>
                  </div>
                ) : connectState === 'waiting' ? (
                  <div className="og-cn-status" role="status">
                    <span className="og-spin" aria-hidden="true" />
                    <span className="og-sm">{t('origami.connect.waiting')}</span>
                  </div>
                ) : (
                  <div className="og-sm">
                    {connectState === 'slow'
                      ? `${t('origami.connect.slow')} `
                      : `${t('origami.connect.step3Text')} `}
                    <Link
                      to="/support"
                      className="og-link"
                      style={{ padding: 0, fontSize: 'inherit' }}
                    >
                      {t('origami.connect.help')}
                    </Link>
                  </div>
                )}
              </div>
            </li>
          </ol>

          {props.qrUrl && (
            <section className="og-cn-plate og-cn-other">
              <QrZoom value={props.qrUrl} />
              <div style={{ minWidth: 0 }}>
                <span className="og-cn-label">{t('origami.connect.other')}</span>
                <div className="og-sm" style={{ fontSize: 13 }}>
                  {t('origami.connect.otherText')}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
