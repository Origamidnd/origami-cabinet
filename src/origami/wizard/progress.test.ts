import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROGRESS,
  mergeProgress,
  parseProgress,
  sameProgress,
  serializeProgress,
} from './progress';

describe('parseProgress', () => {
  it('пустое значение даёт значения по умолчанию', () => {
    expect(parseProgress(null)).toEqual(DEFAULT_PROGRESS);
    expect(parseProgress(undefined)).toEqual(DEFAULT_PROGRESS);
    expect(parseProgress('')).toEqual(DEFAULT_PROGRESS);
  });

  it('повреждённый JSON не бросает ошибку', () => {
    expect(parseProgress('{oops')).toEqual(DEFAULT_PROGRESS);
    expect(parseProgress('null')).toEqual(DEFAULT_PROGRESS);
    expect(parseProgress('"text"')).toEqual(DEFAULT_PROGRESS);
  });

  it('чужие значения полей заменяются безопасными', () => {
    expect(parseProgress('{"step":7,"dismissed":"yes","appId":42}')).toEqual(DEFAULT_PROGRESS);
  });

  it('читает корректное значение', () => {
    expect(parseProgress('{"step":3,"dismissed":true,"appId":"incy"}')).toEqual({
      step: 3,
      dismissed: true,
      appId: 'incy',
    });
  });

  it('круг сериализации сохраняет данные', () => {
    const p = { step: 2 as const, dismissed: false, appId: 'happ' };
    expect(parseProgress(serializeProgress(p))).toEqual(p);
  });
});

describe('mergeProgress', () => {
  it('берёт больший шаг', () => {
    const a = { step: 1 as const, dismissed: false, appId: null };
    const b = { step: 3 as const, dismissed: false, appId: null };
    expect(mergeProgress(a, b).step).toBe(3);
    expect(mergeProgress(b, a).step).toBe(3);
  });

  it('отказ от мастера не теряется с любой стороны', () => {
    const a = { step: 1 as const, dismissed: true, appId: null };
    const b = { step: 2 as const, dismissed: false, appId: null };
    expect(mergeProgress(a, b).dismissed).toBe(true);
    expect(mergeProgress(b, a).dismissed).toBe(true);
  });

  it('приложение: локальное главнее, облачное запасное', () => {
    const local = { step: 1 as const, dismissed: false, appId: 'incy' };
    const remote = { step: 1 as const, dismissed: false, appId: 'happ' };
    expect(mergeProgress(local, remote).appId).toBe('incy');
    expect(mergeProgress({ ...local, appId: null }, remote).appId).toBe('happ');
  });
});

describe('sameProgress', () => {
  it('сравнивает по полям', () => {
    expect(sameProgress(DEFAULT_PROGRESS, { ...DEFAULT_PROGRESS })).toBe(true);
    expect(sameProgress(DEFAULT_PROGRESS, { ...DEFAULT_PROGRESS, step: 2 })).toBe(false);
  });
});
