import { type ReactNode, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CloseIcon } from '@/components/icons';
import { usePlatform } from '@/platform';
import { useFocusTrap } from './useFocusTrap';

interface PanelModalProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Крестик, клик в затемнение. */
  onClose: () => void;
  /** Esc и системная «Назад» Telegram: шаг назад внутри окна или закрытие. По умолчанию - `onClose`. */
  onBack?: () => void;
  children: ReactNode;
}

/**
 * Окно поверх панели (концепция 04): по центру 520 px на ПК, нижний лист на 92% высоты на телефоне.
 * Esc ловится на фазе захвата и дальше не идёт: стоковые страницы внутри окна вешают свой Esc на document
 * (`navigate(-1)`), и без этого шаг назад случался бы дважды.
 */
export default function PanelModal({ eyebrow, title, onClose, onBack, children }: PanelModalProps) {
  const { t } = useTranslation();
  const { capabilities, backButton } = usePlatform();
  const ref = useRef<HTMLElement>(null);
  const back = onBack ?? onClose;

  // Esc обрабатываем здесь, в фокус-ловушку отдаём пустой обработчик.
  useFocusTrap(ref, noop);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      back();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [back]);

  useEffect(() => {
    if (!capabilities.hasBackButton) return;
    backButton.show(back);
    return () => backButton.hide();
  }, [backButton, capabilities.hasBackButton, back]);

  return (
    <>
      <div
        className="og-drawer-bg"
        onClick={onClose}
        aria-hidden="true"
        data-testid="modal-backdrop"
      />
      <section
        ref={ref}
        className="og-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="og-modal-title"
        tabIndex={-1}
      >
        <div className="og-row og-modal-head">
          <div>
            {eyebrow && <div className="og-eyebrow">{eyebrow}</div>}
            <h2 className="og-h2 og-modal-title" id="og-modal-title">
              {title}
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
        <div className="og-modal-body">{children}</div>
      </section>
    </>
  );
}

function noop() {}
