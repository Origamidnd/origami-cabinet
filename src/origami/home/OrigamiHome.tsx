import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subscriptionApi } from '@/api/subscription';
import { API } from '@/config/constants';
import { PageSkeleton } from '@/components/ui/skeleton';
import { registerOrigamiLocales } from '../i18n';
import WizardHome from '../wizard/WizardHome';
import RenewHome from './RenewHome';
import SummaryHome from './SummaryHome';
import { useHomeState } from './useHomeState';
import '../styles/origami.css';

registerOrigamiLocales();

/**
 * Главная форка. Решает, что показать (мастер, сводку, продление), а во всех остальных случаях
 * отдаёт стоковый экран, который передаёт `HomeScreen`.
 */
export default function OrigamiHome({ stock }: { stock: ReactNode }) {
  const { state } = useHomeState();
  // Тот же запрос, что в хуке состояния: ответ берётся из кэша, отдельной сети нет.
  const { data } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionApi.getSubscription(),
    staleTime: API.BALANCE_STALE_TIME_MS,
    enabled: state === 'summary' || state === 'renew' || state === 'wizard',
  });
  const subscription = data?.subscription ?? null;

  switch (state) {
    case 'loading':
      return <PageSkeleton />;
    case 'wizard':
      return <WizardHome subscription={subscription} />;
    case 'summary':
      return subscription ? <SummaryHome subscription={subscription} /> : <PageSkeleton />;
    case 'renew':
      return subscription ? <RenewHome subscription={subscription} /> : <PageSkeleton />;
    default:
      return <>{stock}</>;
  }
}
