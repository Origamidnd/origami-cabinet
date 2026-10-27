import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { balanceApi } from '@/api/balance';
import { useCurrency } from '@/hooks/useCurrency';
import HomeScreen from '@/pages/HomeScreen';
import { getSafeRedirectPath } from '@/utils/safeRedirect';
import { registerOrigamiLocales } from '../i18n';
import '../styles/origami.css';
import '../styles/panel.css';
import PanelModal from './PanelModal';

registerOrigamiLocales();

/** `/balance/top-up/<способ>` - шаг суммы; `/balance/top-up` - выбор способа. */
export function isAmountStep(pathname: string): boolean {
  return /^\/balance\/top-up\/(?!result(?:\/|$))[^/]+\/?$/.test(pathname);
}

/** Куда закрывать окно: безопасный `returnTo` из адреса или обзор. */
export function closeTarget(returnTo: string | null): string {
  if (!returnTo) return '/';
  const safe = getSafeRedirectPath(returnTo);
  return safe && safe !== '/' ? safe : '/';
}

/**
 * Пополнение в панели: обзор остаётся под окном, внутри окна стоковые страницы выбора способа и суммы
 * со всей их логикой оплаты (промокоды, сохранённые карты, Stars, возврат от платёжки).
 * Esc и «Назад» на шаге суммы возвращают к выбору способа, на шаге способа закрывают окно.
 */
export default function PanelTopUp({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const { formatWithCurrency } = useCurrency();
  const { data: balance } = useQuery({ queryKey: ['balance'], queryFn: balanceApi.getBalance });

  const returnTo = params.get('returnTo');
  const close = useCallback(
    () => navigate(closeTarget(returnTo), { replace: true }),
    [navigate, returnTo],
  );
  const back = useCallback(() => {
    if (!isAmountStep(pathname)) return close();
    const keep = new URLSearchParams();
    for (const k of ['amount', 'returnTo']) {
      const v = params.get(k);
      if (v) keep.set(k, v);
    }
    const qs = keep.toString();
    navigate(`/balance/top-up${qs ? `?${qs}` : ''}`, { replace: true });
  }, [pathname, params, navigate, close]);

  return (
    <>
      <HomeScreen />
      <PanelModal
        eyebrow={
          balance
            ? t('origami.topup.eyebrow', { balance: formatWithCurrency(balance.balance_rubles) })
            : undefined
        }
        title={t('origami.topup.title')}
        onClose={close}
        onBack={back}
      >
        {children}
      </PanelModal>
    </>
  );
}
