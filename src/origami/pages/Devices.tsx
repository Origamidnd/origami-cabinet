import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { subscriptionApi } from '@/api/subscription';
import { CheckIcon, PencilIcon, PlusIcon, TrashIcon, XIcon } from '@/components/icons';
import { DeviceTopupSheet } from '@/components/subscription/sheets/DeviceTopupSheet';
import { DEVICE_ALIAS_MAX_LENGTH } from '@/constants/devices';
import { useTheme } from '@/hooks/useTheme';
import { useHaptic } from '@/platform';
import { useDestructiveConfirm } from '@/platform/hooks/useNativeDialog';
import type { Device, SubscriptionListItem } from '@/types';
import { needsTariff } from '@/utils/legacySubscription';
import { DeviceRow } from '../devices/DeviceRow';
import { HelpBlock } from '../home/blocks';
import { registerOrigamiLocales } from '../i18n';
import '../styles/origami.css';
import '../styles/panel.css';

registerOrigamiLocales();

/**
 * Экран «Устройства» панели: шапка как у «Обзора», по пластине на каждую подписку (занято слотов, полоса,
 * список с переименованием и удалением), «Удалить все» тихой ссылкой внизу пластины, ниже блок помощи.
 * Запросы и ключи кэша те же, что у стокового списка на странице подписки (['devices', id]).
 */
export default function Devices() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions-list'],
    queryFn: () => subscriptionApi.getSubscriptions(),
    staleTime: 30_000,
  });
  const subscriptions = data?.subscriptions ?? [];
  const many = subscriptions.length > 1;

  return (
    <div className="og og-wide">
      <div className="og-page-head">
        <div style={{ minWidth: 0 }}>
          <div className="og-eyebrow">{t('origami.devicesPage.eyebrow')}</div>
          <h1 className="og-h1 og-h1-panel">{t('origami.devicesPage.title')}</h1>
        </div>
        {subscriptions.length > 0 && (
          <Link to="/add-device" className="og-btn og-page-head-btn" data-testid="devices-add">
            <PlusIcon className="h-5 w-5" />
            {t('origami.devicesPage.add')}
          </Link>
        )}
      </div>

      {isLoading && <section className="og-w og-devices og-w-loading" aria-busy="true" />}

      {!isLoading && subscriptions.length === 0 && (
        <section className="og-w og-devices" data-testid="devices-nosub">
          <p className="og-sm">{t('origami.devicesPage.noSubscription')}</p>
          <Link to="/subscription/purchase" className="og-btn og-btn-sm og-devices-cta">
            {t('origami.devicesPage.buy')}
          </Link>
        </section>
      )}

      {subscriptions.map((item) => (
        <SubscriptionDevices key={item.id} item={item} showTitle={many} />
      ))}

      <HelpBlock
        title={t('origami.summary.helpTitle')}
        text={t('origami.summary.helpText')}
        button={t('origami.common.support')}
      />
    </div>
  );
}

/** Докупка места: сервер считает цену только для активной подписки; тест и безлимит докупать нечего. */
export function canBuyDevices(
  item: Pick<
    SubscriptionListItem,
    'status' | 'is_trial' | 'device_limit' | 'requires_tariff_selection'
  >,
): boolean {
  return (
    item.status === 'active' && !item.is_trial && item.device_limit !== 0 && !needsTariff(item)
  );
}

function SubscriptionDevices({
  item,
  showTitle,
}: {
  item: SubscriptionListItem;
  showTitle: boolean;
}) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const haptic = useHaptic();
  const confirm = useDestructiveConfirm();
  const key = ['devices', item.id];

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => subscriptionApi.getDevices(item.id),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  const remove = useMutation({
    mutationFn: (hwid: string) => subscriptionApi.deleteDevice(hwid, item.id),
    onSuccess: refresh,
  });
  const removeAll = useMutation({
    mutationFn: () => subscriptionApi.deleteAllDevices(item.id),
    onSuccess: refresh,
  });

  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const rename = useMutation({
    mutationFn: ({ hwid, value }: { hwid: string; value: string | null }) =>
      subscriptionApi.renameDevice(hwid, value, item.id),
    onSuccess: (_d, vars) => {
      refresh();
      haptic.notification('success');
      // Пока шёл запрос, могли начать править другое устройство: его поле не закрываем.
      setEditing((cur) => (cur === vars.hwid ? null : cur));
    },
    onError: () => haptic.notification('error'),
  });
  const save = (hwid: string) => rename.mutate({ hwid, value: name.trim() || null });
  const startEdit = (d: Device) => {
    setEditing(d.hwid);
    setName(d.local_name || '');
  };

  const devices = data?.devices ?? [];
  const limit = data?.device_limit ?? item.device_limit;
  const total = data?.total ?? devices.length;
  const free = limit > 0 ? Math.max(0, limit - total) : null;
  const lang = i18n.language;

  const { isDark } = useTheme();
  const canBuy = canBuyDevices(item);
  const [buying, setBuying] = useState(false);
  const [devicesToAdd, setDevicesToAdd] = useState(1);
  // Баланс для окна покупки: только когда окно открыто, ключ кэша как на странице подписки
  const { data: purchaseOptions } = useQuery({
    queryKey: ['purchase-options', item.id],
    queryFn: () => subscriptionApi.getPurchaseOptions(item.id),
    enabled: buying,
    staleTime: 0,
  });

  return (
    <section className="og-w og-devices" data-testid="devices-sub">
      <div className="og-w-head">
        <span className="og-eyebrow">
          {showTitle && item.tariff_name
            ? `${item.tariff_name} · ${t('origami.overview.devices')}`
            : t('origami.devicesPage.connected')}
        </span>
        {free !== null && (
          <span className="og-sm">
            {free === 0
              ? t('origami.overview.devicesFull')
              : t('origami.overview.devicesFree', { count: free })}
          </span>
        )}
      </div>
      <div className="og-devices-count">
        <div className="og-w-val">
          {total}
          {limit > 0 ? (
            <small>{t('origami.overview.of', { limit })}</small>
          ) : (
            <small>{t('origami.devicesPage.unlimited')}</small>
          )}
        </div>
        {canBuy && !buying && (
          <button
            type="button"
            className={`og-btn og-btn-sm${free === 0 ? '' : ' og-btn-ghost'}`}
            data-testid="devices-buy"
            onClick={() => setBuying(true)}
          >
            {t('origami.devicesPage.topUp')}
          </button>
        )}
      </div>
      {limit > 0 && (
        <div className="og-meter" aria-hidden="true">
          <i style={{ width: `${Math.min(100, Math.round((total / limit) * 100))}%` }} />
        </div>
      )}

      {canBuy && buying && (
        <div className="og-devices-buy">
          <DeviceTopupSheet
            open
            onOpen={() => setBuying(true)}
            onClose={() => setBuying(false)}
            subscription={item}
            subscriptionId={item.id}
            devicesToAdd={devicesToAdd}
            onDevicesToAddChange={setDevicesToAdd}
            purchaseOptions={purchaseOptions}
            isDark={isDark}
          />
        </div>
      )}

      <div className="og-devices-list">
        {isLoading ? (
          <p className="og-sm">{t('origami.common.loading')}</p>
        ) : devices.length === 0 ? (
          <div className="og-devices-empty" data-testid="devices-empty">
            <p className="og-sm">{t('origami.devicesPage.empty')}</p>
            <Link to="/add-device" className="og-btn og-btn-sm og-devices-cta">
              <PlusIcon className="h-5 w-5" />
              {t('origami.devicesPage.add')}
            </Link>
          </div>
        ) : (
          devices.map((d) => {
            const isEditing = editing === d.hwid;
            return (
              <DeviceRow
                key={d.hwid}
                device={d}
                lang={lang}
                actions={
                  isEditing ? (
                    <>
                      <button
                        type="button"
                        className="og-icon-btn"
                        onClick={() => save(d.hwid)}
                        disabled={rename.isPending}
                        aria-label={t('subscription.renameDeviceSave', 'Сохранить')}
                        title={t('subscription.renameDeviceSave', 'Сохранить')}
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="og-icon-btn"
                        onClick={() => setEditing(null)}
                        disabled={rename.isPending}
                        aria-label={t('subscription.renameDeviceCancel', 'Отмена')}
                        title={t('subscription.renameDeviceCancel', 'Отмена')}
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="og-icon-btn"
                        onClick={() => startEdit(d)}
                        aria-label={t('subscription.renameDevice', 'Переименовать')}
                        title={t('subscription.renameDevice', 'Переименовать')}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="og-icon-btn"
                        disabled={remove.isPending}
                        onClick={async () => {
                          const ok = await confirm(
                            t('subscription.confirmDeleteDevice'),
                            t('subscription.deleteDevice'),
                            t('subscription.deleteDevice'),
                          );
                          if (ok) remove.mutate(d.hwid);
                        }}
                        aria-label={t('subscription.deleteDevice')}
                        title={t('subscription.deleteDevice')}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </>
                  )
                }
              >
                {isEditing ? (
                  <input
                    type="text"
                    className="og-dev-input"
                    autoFocus
                    value={name}
                    maxLength={DEVICE_ALIAS_MAX_LENGTH}
                    placeholder={d.device_model || d.platform}
                    aria-label={t('subscription.renameDevice', 'Переименовать')}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        save(d.hwid);
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setEditing(null);
                      }
                    }}
                  />
                ) : undefined}
              </DeviceRow>
            );
          })
        )}
      </div>

      {devices.length > 1 && (
        <button
          type="button"
          className="og-link og-link-danger og-devices-clear"
          disabled={removeAll.isPending}
          onClick={async () => {
            const ok = await confirm(
              t('subscription.confirmDeleteAllDevices'),
              t('subscription.deleteAllDevices'),
              t('subscription.deleteAllDevices'),
            );
            if (ok) removeAll.mutate();
          }}
        >
          {t('origami.devicesPage.removeAll')}
        </button>
      )}
    </section>
  );
}
