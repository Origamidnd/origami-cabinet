import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

interface QrZoomProps {
  value: string;
}

/** Маленький QR, который по нажатию открывается крупно на весь экран для удобного сканирования. */
export function QrZoom({ value }: QrZoomProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = openerRef.current;
    closeRef.current?.focus();
    // слушаем в фазе перехвата: окно подключения под нами тоже ловит Esc и Tab, их не должны получить двое
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        setOpen(false);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      opener?.focus?.();
    };
  }, [open]);

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        className="og-qr og-qr-btn"
        aria-label={t('origami.add.qrOpen')}
        onClick={() => setOpen(true)}
      >
        <QRCodeSVG value={value} size={96} level="M" />
      </button>
      {open &&
        createPortal(
          <div
            className="og-qr-zoom"
            role="dialog"
            aria-modal="true"
            aria-label={t('origami.add.qrOpen')}
            data-testid="qr-zoom"
            onClick={() => setOpen(false)}
          >
            <div className="og-qr-zoom-plate">
              <QRCodeSVG value={value} size={512} level="M" marginSize={2} />
            </div>
            <div className="og-qr-zoom-hint">{t('origami.add.qrHint')}</div>
            <button
              ref={closeRef}
              type="button"
              className="og-btn og-btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
            >
              {t('origami.add.qrClose')}
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
