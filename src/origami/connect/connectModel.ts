import type { LocalizedText, RemnawaveAppClient, RemnawavePlatformData } from '@/types';
import { collapseDoubledCryptPrefix, hasTemplates, resolveTemplate } from '@/utils/templateEngine';

/** Порядок платформ тот же, что в стоковом `InstallationGuide`. */
export const PLATFORM_ORDER = [
  'ios',
  'android',
  'windows',
  'macos',
  'linux',
  'androidTV',
  'appleTV',
] as const;

/** На телефонах рекомендуем INCY, если он есть в списке приложений проекта. */
const PREFERRED_APP_BY_PLATFORM: Record<string, string> = { ios: 'incy', android: 'incy' };

/** Платформа по User-Agent; та же логика, что в стоковой странице подключения. */
export function detectPlatform(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return /tv|television/.test(ua) ? 'androidTV' : 'android';
  if (/macintosh|mac os x/.test(ua)) return 'macos';
  if (/windows/.test(ua)) return 'windows';
  if (/linux/.test(ua)) return 'linux';
  return null;
}

/** Платформы, у которых в конфигурации есть приложения; определённая по UA идёт первой. */
export function orderPlatforms(
  platforms: Record<string, RemnawavePlatformData> | undefined,
  detected: string | null,
): string[] {
  if (!platforms) return [];
  const available = PLATFORM_ORDER.filter((key) => (platforms[key]?.apps?.length ?? 0) > 0);
  if (detected && available.includes(detected as (typeof PLATFORM_ORDER)[number])) {
    return [detected, ...available.filter((p) => p !== detected)];
  }
  return [...available];
}

/** Устойчивый идентификатор приложения для хранения выбора: имя в нижнем регистре без лишнего. */
export function appId(app: Pick<RemnawaveAppClient, 'name'>): string {
  return app.name.toLowerCase().replace(/[^a-z0-9а-яё]+/g, '');
}

/**
 * Рекомендуемое приложение платформы.
 * Выбор человека (если приложение ещё есть в списке) главнее; на iOS и Android - INCY, на остальных
 * платформах - первое приложение из списка проекта.
 */
export function recommendedApp(
  platform: string,
  apps: RemnawaveAppClient[] | undefined,
  chosenId?: string | null,
): RemnawaveAppClient | null {
  if (!apps || apps.length === 0) return null;
  if (chosenId) {
    const chosen = apps.find((a) => appId(a) === chosenId);
    if (chosen) return chosen;
  }
  const preferred = PREFERRED_APP_BY_PLATFORM[platform];
  if (preferred) {
    const match = apps.find((a) => appId(a) === preferred);
    if (match) return match;
    return apps.find((a) => a.featured) ?? apps[0];
  }
  return apps[0];
}

function isWebUrl(url: string | undefined | null): url is string {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

/**
 * Ссылка на установку приложения (магазин или сайт): первая внешняя кнопка в блоках приложения.
 * Кнопки со ссылкой подписки и копированием пропускаем - они относятся к шагу «Добавить подписку».
 */
export function findInstallUrl(app: RemnawaveAppClient | null): string | null {
  if (!app) return null;
  for (const block of app.blocks ?? []) {
    for (const button of block.buttons ?? []) {
      if (button.type === 'subscriptionLink' || button.type === 'copyButton') continue;
      const url = button.resolvedUrl ?? button.url ?? button.link;
      if (isWebUrl(url) && !/\{\{[A-Z0-9_]+\}\}/.test(url)) return url;
    }
  }
  return null;
}

export interface InstallLink {
  url: string;
  /** Подпись кнопки из конфига («Скачать для Windows», «.deb (Ubuntu/Debian)»), пусто - подпись по умолчанию. */
  label: string;
}

/**
 * Все ссылки установки приложения (кнопки-ссылки блока установки) с подписями, как на странице подписки:
 * у одного приложения их может быть несколько (.deb, .rpm, .pkg). Описание блока - текст шага, если задан.
 */
export function findInstall(
  app: RemnawaveAppClient | null,
  lang: string | undefined,
): { links: InstallLink[]; text: string } {
  if (!app) return { links: [], text: '' };
  for (const block of app.blocks ?? []) {
    const links: InstallLink[] = [];
    for (const button of block.buttons ?? []) {
      if (button.type === 'subscriptionLink' || button.type === 'copyButton') continue;
      const url = button.resolvedUrl ?? button.url ?? button.link;
      if (isWebUrl(url) && !/\{\{[A-Z0-9_]+\}\}/.test(url)) {
        links.push({ url, label: localized(button.text, lang) });
      }
    }
    if (links.length > 0) return { links, text: localized(block.description, lang) };
  }
  return { links: [], text: '' };
}

/** Текст на языке интерфейса с запасными вариантами, как делает стоковый гид. */
export function localized(text: LocalizedText | undefined, lang: string | undefined): string {
  if (!text) return '';
  return text[lang || 'en'] || text.en || text.ru || Object.values(text)[0] || '';
}

const DANGEROUS_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'file:'];

function isValidDeepLink(url: string | null | undefined): url is string {
  if (!url) return false;
  const lower = url.toLowerCase().trim();
  if (DANGEROUS_SCHEMES.some((scheme) => lower.startsWith(scheme))) return false;
  return lower.includes('://');
}

/**
 * Ссылка кнопки «Добавить подписку в приложение»: те же правила, что у кнопки типа `subscriptionLink`
 * в стоковых блоках гида (шаблоны разворачиваются на клиенте, неразвёрнутые и опасные схемы отбрасываются).
 */
export function findAddLink(
  app: RemnawaveAppClient | null,
  subscriptionUrl: string | null,
  username?: string,
): string | null {
  if (!app) return null;
  const button = (app.blocks ?? [])
    .flatMap((block) => block.buttons ?? [])
    .find((b) => b.type === 'subscriptionLink');
  const raw = button?.resolvedUrl || button?.url || button?.link || app.deepLink || subscriptionUrl;
  if (!raw) return null;
  const resolved =
    subscriptionUrl && hasTemplates(raw)
      ? resolveTemplate(raw, { subscriptionUrl, username })
      : raw;
  const url = collapseDoubledCryptPrefix(resolved);
  if (hasTemplates(url) || !isValidDeepLink(url)) return null;
  return url;
}
