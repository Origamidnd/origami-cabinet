import type { ReactNode } from 'react';
import { MonitorIcon, PhoneIcon } from '@/components/icons';
import type { Device } from '@/types';
import { longDate } from '../home/format';

type DeviceLike = Pick<Device, 'hwid' | 'platform' | 'device_model' | 'created_at' | 'local_name'>;

/** Имя устройства: своё название, модель или платформа. */
export function deviceTitle(d: DeviceLike): string {
  return d.local_name?.trim() || d.device_model || d.platform;
}

/** Компьютеры и телевизоры - монитор, остальное (телефоны, планшеты) - телефон. */
export function isDesktopPlatform(platform: string | null | undefined): boolean {
  return /windows|mac|darwin|linux|tv/i.test(platform ?? '');
}

/** Подпись под именем: «iOS, 25 октября 2026 г.». */
export function deviceMeta(d: DeviceLike, lang: string): string {
  return [d.platform, longDate(d.created_at, lang)].filter(Boolean).join(', ');
}

/**
 * Строка устройства, общая для виджета на обзоре и экрана «Устройства»: иконка платформы, имя, платформа
 * и дата. `children` - заменяет имя (поле переименования), `actions` - кнопки справа.
 */
export function DeviceRow({
  device,
  lang,
  children,
  actions,
}: {
  device: DeviceLike;
  lang: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  const Icon = isDesktopPlatform(device.platform) ? MonitorIcon : PhoneIcon;
  return (
    <div className="og-dev" data-testid="device-row">
      <div className="og-dev-ico" aria-hidden="true">
        <Icon className="h-5 w-5" />
      </div>
      <div className="og-dev-main">
        {children ?? <b className="og-dev-name">{deviceTitle(device)}</b>}
        <div className="og-sm">{deviceMeta(device, lang)}</div>
      </div>
      {actions && <div className="og-dev-actions">{actions}</div>}
    </div>
  );
}
