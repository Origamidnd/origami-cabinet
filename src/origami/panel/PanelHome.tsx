import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { balanceApi } from '@/api/balance';
import { referralApi } from '@/api/referral';
import { subscriptionApi } from '@/api/subscription';
import { PageSkeleton } from '@/components/ui/skeleton';
import { API } from '@/config/constants';
import { useCurrency } from '@/hooks/useCurrency';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useAuthStore } from '@/store/auth';
import { displayName } from '@/utils/displayName';
import { useHomeState } from '../home/useHomeState';
import { useWizardProgress } from '../wizard/useWizardProgress';
import OverviewWidgets from './OverviewWidgets';
import { useLkExtras } from './useLkExtras';
import '../styles/origami.css';
import '../styles/panel.css';

/**
 * Обзор панели (`/`). Состояние выбирает то же правило, что у мастера: активная подписка без устройств
 * и трафика даёт блок «Давайте подключим VPN», закончившаяся - виджет в состоянии «Закончилась»,
 * всё остальное (нет подписки, выбор тарифа, пауза суточного, лимит трафика, мультитариф) отдаётся стоку.
 */
export default function PanelHome({ stock }: { stock: ReactNode }) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { state } = useHomeState();
  const { update } = useWizardProgress();
  const { formatWithCurrency } = useCurrency();
  const { referralEnabled } = useFeatureFlags();
  const user = useAuthStore((s) => s.user);
  const active = state === 'wizard' || state === 'summary' || state === 'renew';

  const { data: subResponse } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionApi.getSubscription(),
    staleTime: API.BALANCE_STALE_TIME_MS,
    enabled: active,
  });
  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => subscriptionApi.getDevices(),
    staleTime: API.BALANCE_STALE_TIME_MS,
    enabled: active,
  });
  const { data: balance } = useQuery({
    queryKey: ['balance'],
    queryFn: balanceApi.getBalance,
    staleTime: API.BALANCE_STALE_TIME_MS,
    enabled: active,
  });
  const { data: referral } = useQuery({
    queryKey: ['referral-info'],
    queryFn: referralApi.getReferralInfo,
    enabled: active && referralEnabled,
    retry: false,
  });

  // Серверы и трафик по дням со страницы подписки (хук до ранних return).
  const extras = useLkExtras(active ? subResponse?.subscription?.subscription_url : null);

  if (state === 'stock') return <>{stock}</>;
  const subscription = subResponse?.subscription ?? null;
  if (state === 'loading' || !subscription) return <PageSkeleton />;

  return (
    <OverviewWidgets
      state={state}
      name={displayName(user)}
      lang={i18n.language}
      subscription={subscription}
      devices={devices}
      balanceText={balance ? formatWithCurrency(balance.balance_rubles) : null}
      extras={extras}
      referral={
        referralEnabled && referral
          ? {
              total: referral.total_referrals,
              active: referral.active_referrals,
              earnedText: formatWithCurrency(referral.total_earnings_rubles),
              percent: referral.commission_percent,
            }
          : null
      }
      onConnect={() => navigate('/add-device')}
      onDismiss={() => update({ dismissed: true })}
    />
  );
}
