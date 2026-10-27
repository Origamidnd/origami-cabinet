import { useQuery } from '@tanstack/react-query';
import { lkDataUrl, parseLkExtras, type LkExtras } from './extras';

/**
 * Серверы и трафик по дням со страницы подписки. Без повторов при ошибке: виджеты необязательные,
 * обзор без них остаётся рабочим. Кука и токены кабинета туда не уходят (`credentials: 'omit'`).
 */
export function useLkExtras(subscriptionUrl: string | null | undefined): LkExtras | null {
  const url = lkDataUrl(subscriptionUrl);
  const { data } = useQuery({
    queryKey: ['origami-lk-extras', url],
    queryFn: async () => {
      const res = await fetch(url as string, {
        credentials: 'omit',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return null;
      return parseLkExtras(await res.json());
    },
    enabled: url !== null,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  return data ?? null;
}
