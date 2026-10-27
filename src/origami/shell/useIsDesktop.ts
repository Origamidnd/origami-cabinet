import { useSyncExternalStore } from 'react';

const QUERY = '(min-width: 1024px)';

function subscribe(listener: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', listener);
  return () => mq.removeEventListener('change', listener);
}

const getSnapshot = () => window.matchMedia(QUERY).matches;
const getServerSnapshot = () => false;

/** Широкий экран (от 1024 px): боковая колонка вместо нижней панели. Меняется при повороте и ресайзе. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
