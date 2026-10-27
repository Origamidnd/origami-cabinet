import { lazy, type ReactNode } from 'react';
import { ORIGAMI_SHELL } from '../shell/config';

// Окно тянет за собой обзор (HomeScreen), поэтому грузится только в панели и только на этих маршрутах.
const PanelTopUp = lazy(() => import('../panel/PanelTopUp'));

/**
 * Обёртка стоковых страниц пополнения (`/balance/top-up`, `/balance/top-up/:methodId`):
 * в панели они открываются окном поверх обзора, в остальных оболочках - как раньше, страницей.
 * Suspense даёт `LazyPage` маршрута.
 */
export default function OrigamiTopUp({ children }: { children: ReactNode }) {
  return ORIGAMI_SHELL === 'panel' ? <PanelTopUp>{children}</PanelTopUp> : children;
}
