import DOMPurify from 'dompurify';
import type { AppConfig } from '@/types';

/**
 * Значок приложения из библиотеки страницы подписки в панели. Очистка как у стокового гида, а белую заливку
 * заменяем на текущий цвет, иначе в светлой теме значок белый на белом. Пусто - значка нет, показываем букву.
 */
export function appIconSvg(
  key: string | undefined,
  library: AppConfig['svgLibrary'] | undefined,
): string {
  const entry = key ? library?.[key] : undefined;
  if (!entry) return '';
  const raw = typeof entry === 'string' ? entry : entry.svgString;
  return DOMPurify.sanitize(raw, { USE_PROFILES: { svg: true, svgFilters: true } }).replace(
    /\b(fill|stroke)="(?:#fafafa|#fff|#ffffff|white)"/gi,
    '$1="currentColor"',
  );
}
