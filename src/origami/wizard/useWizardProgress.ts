import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { usePlatform } from '@/platform';
import { safeLocal } from '@/utils/safeStorage';
import {
  mergeProgress,
  parseProgress,
  sameProgress,
  serializeProgress,
  WIZARD_CLOUD_KEY,
  WIZARD_STORAGE_KEY,
  type WizardProgress,
} from './progress';

/**
 * Одно общее хранилище прогресса на вкладку: главная, мастер и экран подключения читают одно и то же
 * значение и узнают об изменениях сразу, без прокидывания состояния через маршруты.
 */
const listeners = new Set<() => void>();
let snapshot: WizardProgress = parseProgress(safeLocal.getItem(WIZARD_STORAGE_KEY));

function emit(next: WizardProgress) {
  snapshot = next;
  safeLocal.setItem(WIZARD_STORAGE_KEY, serializeProgress(next));
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Прогресс могла изменить другая вкладка.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== WIZARD_STORAGE_KEY) return;
    const next = parseProgress(e.newValue);
    if (!sameProgress(next, snapshot)) {
      snapshot = next;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

const getSnapshot = () => snapshot;

export interface WizardProgressApi {
  progress: WizardProgress;
  update: (patch: Partial<WizardProgress>) => void;
  /** Забыть отказ и вернуться к первому шагу: когда мастер открывают осознанно, кнопкой «Добавить устройство». */
  restart: (step?: WizardProgress['step']) => void;
}

export function useWizardProgress(): WizardProgressApi {
  const progress = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const { cloudStorage } = usePlatform();

  // Подтягиваем облачное значение один раз и склеиваем с локальным.
  useEffect(() => {
    if (!cloudStorage) return;
    let cancelled = false;
    cloudStorage
      .getItem(WIZARD_CLOUD_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const merged = mergeProgress(snapshot, parseProgress(raw));
        if (!sameProgress(merged, snapshot)) emit(merged);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [cloudStorage]);

  const update = useCallback(
    (patch: Partial<WizardProgress>) => {
      const next = { ...snapshot, ...patch };
      if (sameProgress(next, snapshot)) return;
      emit(next);
      cloudStorage?.setItem(WIZARD_CLOUD_KEY, serializeProgress(next)).catch(() => {});
    },
    [cloudStorage],
  );

  const restart = useCallback(
    (step: WizardProgress['step'] = 1) => update({ step, dismissed: false }),
    [update],
  );

  return { progress, update, restart };
}
