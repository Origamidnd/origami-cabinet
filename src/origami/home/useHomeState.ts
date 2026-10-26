import { useQuery } from '@tanstack/react-query';
import { subscriptionApi } from '@/api/subscription';
import { API } from '@/config/constants';
import { useWizardProgress } from '../wizard/useWizardProgress';
import { type HomeState, resolveHomeState } from './homeState';

export interface HomeStateResult {
  state: HomeState;
  devicesTotal: number | null;
}

/**
 * Состояние главной по данным API.
 * Ключи запросов те же, что у стоковой главной (`subscriptions-list`, `subscription`, `devices`),
 * поэтому кэш общий и стоковый экран, если он понадобится, не делает лишних запросов.
 */
export function useHomeState(): HomeStateResult {
  const { progress } = useWizardProgress();

  const { data: multi, isLoading: multiLoading } = useQuery({
    queryKey: ['subscriptions-list'],
    queryFn: () => subscriptionApi.getSubscriptions(),
    staleTime: 60_000,
  });
  const multiTariff = multi?.multi_tariff_enabled ?? false;

  const { data: subResponse, isLoading: subLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionApi.getSubscription(),
    retry: false,
    staleTime: API.BALANCE_STALE_TIME_MS,
    refetchOnMount: 'always',
    enabled: !multiTariff && !multiLoading,
  });
  const subscription = subResponse?.subscription ?? null;

  // Список устройств нужен только рабочей подписке: у просроченной мастер не показывается.
  const needDevices = !!subscription && !subscription.is_expired && !multiTariff;
  const { data: devices, isLoading: devicesLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: () => subscriptionApi.getDevices(),
    enabled: needDevices,
    staleTime: API.BALANCE_STALE_TIME_MS,
    retry: 1,
  });

  const devicesTotal = devices ? devices.total : null;

  const state = resolveHomeState({
    multiTariff,
    subscriptionLoading: multiLoading || (!multiTariff && subLoading),
    subscription,
    devicesLoading: needDevices && devicesLoading,
    devicesTotal,
    wizardDismissed: progress.dismissed,
  });

  return { state, devicesTotal };
}
