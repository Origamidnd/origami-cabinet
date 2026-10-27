import { describe, expect, it } from 'vitest';
import type { RemnawaveAppClient, RemnawavePlatformData } from '@/types';
import {
  appId,
  findAddLink,
  detectPlatform,
  findInstall,
  findInstallUrl,
  localized,
  orderPlatforms,
  recommendedApp,
} from './connectModel';

const app = (name: string, extra: Partial<RemnawaveAppClient> = {}): RemnawaveAppClient => ({
  name,
  blocks: [],
  ...extra,
});

describe('detectPlatform', () => {
  it('различает основные платформы', () => {
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('ios');
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe('android');
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 12; BRAVIA TV)')).toBe('androidTV');
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('macos');
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('windows');
    expect(detectPlatform('Mozilla/5.0 (X11; Linux x86_64)')).toBe('linux');
  });

  it('неизвестное и пустое дают null', () => {
    expect(detectPlatform('curl/8.0')).toBeNull();
    expect(detectPlatform('')).toBeNull();
    expect(detectPlatform(null)).toBeNull();
  });
});

describe('orderPlatforms', () => {
  const data = (n: number): RemnawavePlatformData => ({
    apps: Array.from({ length: n }, (_, i) => app(`a${i}`)),
  });

  it('определённая платформа идёт первой, пустые отбрасываются', () => {
    const platforms = { ios: data(1), android: data(2), windows: data(0), macos: data(1) };
    expect(orderPlatforms(platforms, 'macos')).toEqual(['macos', 'ios', 'android']);
  });

  it('если определённой нет в списке, остаётся порядок проекта', () => {
    expect(orderPlatforms({ ios: data(1), windows: data(1) }, 'linux')).toEqual(['ios', 'windows']);
    expect(orderPlatforms(undefined, 'ios')).toEqual([]);
  });
});

describe('recommendedApp', () => {
  const apps = [app('Happ', { featured: true }), app('INCY'), app('Clash Verge')];

  it('на iOS и Android рекомендует INCY', () => {
    expect(recommendedApp('ios', apps)?.name).toBe('INCY');
    expect(recommendedApp('android', apps)?.name).toBe('INCY');
  });

  it('если INCY в списке нет, берёт featured или первое', () => {
    expect(recommendedApp('ios', [app('Happ', { featured: true }), app('Other')])?.name).toBe(
      'Happ',
    );
    expect(recommendedApp('android', [app('One'), app('Two')])?.name).toBe('One');
  });

  it('на ПК берёт первое приложение списка', () => {
    expect(recommendedApp('windows', apps)?.name).toBe('Happ');
    expect(
      recommendedApp('macos', [app('Clash Verge'), app('Happ', { featured: true })])?.name,
    ).toBe('Clash Verge');
  });

  it('выбор человека главнее, пока приложение есть в списке', () => {
    expect(recommendedApp('ios', apps, appId(app('Happ')))?.name).toBe('Happ');
    expect(recommendedApp('ios', apps, 'gone')?.name).toBe('INCY');
  });

  it('пустой список даёт null', () => {
    expect(recommendedApp('ios', [])).toBeNull();
    expect(recommendedApp('ios', undefined)).toBeNull();
  });
});

describe('findInstallUrl', () => {
  it('берёт первую внешнюю веб-ссылку', () => {
    const a = app('INCY', {
      blocks: [
        {
          title: { en: 'Install' },
          description: { en: '' },
          buttons: [
            { text: { en: 'App Store' }, type: 'external', url: 'https://apps.apple.com/app/x' },
          ],
        },
        {
          title: { en: 'Add' },
          description: { en: '' },
          buttons: [
            { text: { en: 'Add' }, type: 'subscriptionLink', link: '{{SUBSCRIPTION_LINK}}' },
          ],
        },
      ],
    });
    expect(findInstallUrl(a)).toBe('https://apps.apple.com/app/x');
  });

  it('пропускает кнопки подписки и шаблонные ссылки', () => {
    const a = app('X', {
      blocks: [
        {
          title: { en: '' },
          description: { en: '' },
          buttons: [
            { text: { en: 'sub' }, type: 'subscriptionLink', url: 'https://example.test/sub' },
            { text: { en: 'tpl' }, type: 'external', url: 'https://x.test/{{USERNAME}}' },
          ],
        },
      ],
    });
    expect(findInstallUrl(a)).toBeNull();
  });

  it('схемы приложений не считаются ссылкой установки', () => {
    const a = app('X', {
      blocks: [
        {
          title: { en: '' },
          description: { en: '' },
          buttons: [{ text: { en: 'open' }, type: 'external', url: 'incy://open' }],
        },
      ],
    });
    expect(findInstallUrl(a)).toBeNull();
    expect(findInstallUrl(null)).toBeNull();
  });
});

describe('findInstall', () => {
  it('все ссылки установки с подписями и описание шага, как на странице подписки', () => {
    const a = app('Happ', {
      blocks: [
        {
          title: { ru: 'Установка приложения' },
          description: { ru: 'Скачайте и установите Happ' },
          buttons: [
            {
              text: { ru: '.deb (Ubuntu/Debian)' },
              type: 'external',
              link: 'https://x.test/happ.deb',
            },
            {
              text: { ru: '.rpm (Fedora/RHEL)' },
              type: 'external',
              link: 'https://x.test/happ.rpm',
            },
          ],
        },
        {
          title: { ru: 'Добавление подписки' },
          description: { ru: '' },
          buttons: [
            {
              text: { ru: 'Добавить' },
              type: 'subscriptionLink',
              link: 'happ://add/{{SUBSCRIPTION_LINK}}',
            },
          ],
        },
      ],
    });
    expect(findInstall(a, 'ru')).toEqual({
      links: [
        { url: 'https://x.test/happ.deb', label: '.deb (Ubuntu/Debian)' },
        { url: 'https://x.test/happ.rpm', label: '.rpm (Fedora/RHEL)' },
      ],
      text: 'Скачайте и установите Happ',
    });
  });

  it('нет ссылок установки или приложения - пусто', () => {
    expect(findInstall(null, 'ru')).toEqual({ links: [], text: '' });
    expect(findInstall(app('X'), 'ru')).toEqual({ links: [], text: '' });
  });
});

describe('localized', () => {
  it('идёт по запасным языкам', () => {
    expect(localized({ ru: 'Привет', en: 'Hi' }, 'ru')).toBe('Привет');
    expect(localized({ en: 'Hi' }, 'de')).toBe('Hi');
    expect(localized({ fa: 'x' }, 'de')).toBe('x');
    expect(localized(undefined, 'ru')).toBe('');
  });
});

describe('findAddLink', () => {
  const sub = 'https://example.test/sub/abc';

  it('разворачивает шаблон из deepLink приложения', () => {
    const a = app('INCY', { deepLink: 'incy://import/{{SUBSCRIPTION_LINK}}' });
    expect(findAddLink(a, sub)).toBe(`incy://import/${sub}`);
  });

  it('кнопка subscriptionLink главнее deepLink приложения', () => {
    const a = app('Happ', {
      deepLink: 'happ://other/{{SUBSCRIPTION_LINK}}',
      blocks: [
        {
          title: { en: '' },
          description: { en: '' },
          buttons: [
            {
              text: { en: 'Add' },
              type: 'subscriptionLink',
              url: 'happ://add/{{SUBSCRIPTION_LINK}}',
            },
          ],
        },
      ],
    });
    expect(findAddLink(a, sub)).toBe(`happ://add/${sub}`);
  });

  it('опасные схемы и ссылки без схемы отбрасываются', () => {
    // eslint-disable-next-line no-script-url
    expect(findAddLink(app('X', { deepLink: 'javascript://alert(1)' }), sub)).toBeNull();
    expect(findAddLink(app('X', { deepLink: 'plain-text' }), sub)).toBeNull();
  });

  it('без приложения и без ссылки подписки ничего не возвращает', () => {
    expect(findAddLink(null, sub)).toBeNull();
    expect(findAddLink(app('X'), null)).toBeNull();
  });

  it('неразвёрнутый шаблон не отдаётся', () => {
    expect(findAddLink(app('X', { deepLink: 'x://{{UNKNOWN}}' }), sub)).toBeNull();
  });
});
