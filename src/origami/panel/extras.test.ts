import { describe, expect, it } from 'vitest';
import { lkDataUrl, parseLkExtras, sortServers } from './extras';

describe('lkDataUrl', () => {
  it('ссылка подписки вида https://host/<shortUuid> -> адрес lk.json', () => {
    expect(lkDataUrl('https://sub.origamivpn.pro/AbC123xyz_-')).toBe(
      'https://sub.origamivpn.pro/AbC123xyz_-/lk.json',
    );
    expect(lkDataUrl('https://sub.origamivpn.pro/AbC123xyz/')).toBe(
      'https://sub.origamivpn.pro/AbC123xyz/lk.json',
    );
  });

  it('прочие ссылки не трогаем', () => {
    for (const u of [
      null,
      '',
      'not a url',
      'http://sub.origamivpn.pro/AbC123xyz',
      'https://sub.origamivpn.pro/a/b',
      'https://sub.origamivpn.pro/AbC123xyz?x=1',
      'https://sub.origamivpn.pro/abc',
      'happ://crypt3/xxxx',
    ]) {
      expect(lkDataUrl(u)).toBeNull();
    }
  });
});

describe('parseLkExtras', () => {
  it('берёт только правильные поля, пинг округляет, плохие значения отбрасывает', () => {
    expect(
      parseLkExtras({
        servers: [
          { name: 'DE', online: true, pingMs: 36.6 },
          { name: 'SE', online: false, pingMs: null },
          { name: 'X', online: 'yes' },
          null,
          { name: 'NL', online: true, pingMs: -1 },
        ],
        traffic: [{ date: 'a', bytes: 5 }, { date: 'b', bytes: 'x' }, null, { bytes: -3 }],
      }),
    ).toEqual({
      servers: [
        { name: 'DE', online: true, pingMs: 37 },
        { name: 'SE', online: false, pingMs: null },
        { name: 'NL', online: true, pingMs: null },
      ],
      traffic: [5, 0, 0, 0],
    });
  });

  it('не та форма - null', () => {
    expect(parseLkExtras(null)).toBeNull();
    expect(parseLkExtras({ servers: {}, traffic: [] })).toBeNull();
    expect(parseLkExtras('x')).toBeNull();
  });
});

describe('sortServers', () => {
  it('в сети по пингу, без пинга после, без связи в конце, не больше лимита', () => {
    const s = sortServers(
      [
        { name: 'off', online: false, pingMs: null },
        { name: 'slow', online: true, pingMs: 90 },
        { name: 'nop', online: true, pingMs: null },
        { name: 'fast', online: true, pingMs: 30 },
      ],
      3,
    );
    expect(s.map((x) => x.name)).toEqual(['fast', 'slow', 'nop']);
  });
});
