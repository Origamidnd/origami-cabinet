import { type RefObject, useEffect } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Модальное окно: при открытии фокус уходит внутрь, Tab и Shift+Tab ходят по кругу, Esc зовёт `onEscape`,
 * при закрытии фокус возвращается на элемент, который был в фокусе до открытия (кнопка, открывшая окно).
 * Прокрутка страницы под окном блокируется.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, onEscape: () => void): void {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const opener = document.activeElement as HTMLElement | null;
    const focusables = () =>
      [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.hidden);
    (focusables()[0] ?? root).focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (e.shiftKey && (current === first || !root.contains(current))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || !root.contains(current))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    const prevBody = document.body.style.overflow;
    const prevRoot = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevRoot;
      opener?.focus?.();
    };
  }, [ref, onEscape]);
}
