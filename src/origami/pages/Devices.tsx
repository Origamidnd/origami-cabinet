import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { subscriptionApi } from '@/api/subscription';
import { PlusIcon } from '@/components/icons';
import { DevicesPanel } from '@/components/subscription/manage/DevicesPanel';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { useTheme } from '@/hooks/useTheme';
import type { SubscriptionListItem } from '@/types';
import { getGlassColors } from '@/utils/glassTheme';
import { registerOrigamiLocales } from '../i18n';

registerOrigamiLocales();

/**
 * Экран «Устройства»: список подключённых устройств отдельно от страницы подписки. Сам список - стоковый
 * `DevicesPanel` (переименование, удаление), поэтому запросы и кэш общие со страницей подписки.
 * При нескольких тарифах - по карточке на каждую подписку с её названием.
 */
export default function Devices() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const g = getGlassColors(isDark);

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions-list'],
    queryFn: () => subscriptionApi.getSubscriptions(),
    staleTime: 30_000,
  });
  const subscriptions = data?.subscriptions ?? [];
  const showTitles = subscriptions.length > 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="truncate text-xl font-bold" style={{ color: g.text }}>
          {t('origami.devicesPage.title')}
        </h1>
        {subscriptions.length > 0 && (
          <Link
            to="/add-device"
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-accent-500 px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-600"
          >
            <PlusIcon className="h-4 w-4" />
            {t('origami.devicesPage.add')}
          </Link>
        )}
      </div>

      {isLoading && (
        <SkeletonGroup className="space-y-3">
          <Skeleton variant="card" count={3} className="h-16" />
        </SkeletonGroup>
      )}

      {!isLoading && subscriptions.length === 0 && (
        <div
          className="rounded-3xl p-8 text-center text-sm"
          style={{
            background: g.cardBg,
            border: `1px solid ${g.cardBorder}`,
            color: g.textSecondary,
          }}
        >
          <p className="mb-4">{t('origami.devicesPage.noSubscription')}</p>
          <Link
            to="/subscription/purchase"
            className="inline-block rounded-xl bg-accent-500 px-6 py-2.5 font-medium text-on-accent transition-colors hover:bg-accent-600"
          >
            {t('origami.devicesPage.buy')}
          </Link>
        </div>
      )}

      {subscriptions.map((item) => (
        <SubscriptionDevices key={item.id} item={item} showTitle={showTitles} />
      ))}
    </div>
  );
}

function SubscriptionDevices({
  item,
  showTitle,
}: {
  item: SubscriptionListItem;
  showTitle: boolean;
}) {
  const { isDark } = useTheme();
  const g = getGlassColors(isDark);
  // DevicesPanel ждёт полную подписку; ключ тот же, что у страницы подписки, так что запрос общий.
  const { data } = useQuery({
    queryKey: ['subscription', item.id],
    queryFn: () => subscriptionApi.getSubscription(item.id),
  });
  const subscription = data?.subscription;

  return (
    <div
      className="relative overflow-hidden rounded-3xl"
      style={{
        background: g.cardBg,
        border: `1px solid ${g.cardBorder}`,
        boxShadow: g.shadow,
        padding: '24px 28px',
      }}
    >
      {showTitle && item.tariff_name && (
        <div className="mb-3 text-[11px] font-medium uppercase tracking-wide text-dark-400">
          {item.tariff_name}
        </div>
      )}
      {subscription ? (
        <DevicesPanel subscription={subscription} subscriptionId={item.id} />
      ) : (
        <SkeletonGroup className="space-y-3">
          <Skeleton variant="card" count={2} className="h-16" />
        </SkeletonGroup>
      )}
    </div>
  );
}
