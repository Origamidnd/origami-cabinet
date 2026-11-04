import { describe, expect, it } from 'vitest';
import { deviceTitle, isDesktopPlatform } from './DeviceRow';

describe('строка устройства', () => {
  it('компьютеры и ТВ - монитор, телефоны и планшеты - нет', () => {
    for (const p of ['Windows', 'macOS', 'Linux', 'Android TV'])
      expect(isDesktopPlatform(p)).toBe(true);
    for (const p of ['iOS', 'Android', 'iPadOS', '', null])
      expect(isDesktopPlatform(p)).toBe(false);
  });
  it('имя: своё название, модель, платформа', () => {
    const d = { hwid: '1', platform: 'iOS', device_model: 'iPhone 15', created_at: null };
    expect(deviceTitle({ ...d, local_name: ' Мой ' })).toBe('Мой');
    expect(deviceTitle(d)).toBe('iPhone 15');
    expect(deviceTitle({ ...d, device_model: '' })).toBe('iOS');
  });
});
