import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { subscriptionApi } from '@/api/subscription';
import { usePlatform } from '@/platform';
import { useAuthStore } from '@/store/auth';
import { displayName } from '@/utils/displayName';
import { useConnect } from '../connect/useConnect';
import type { WizardStep } from './progress';
import { useWizardProgress } from './useWizardProgress';

/** Как часто спрашиваем список устройств на шаге 3 и сколько ждём, прежде чем подсказать про поддержку. */
const POLL_INTERVAL_MS = 4000;
const POLL_LIMIT_MS = 150_000;

type StepState = 'done' | 'cur' | 'todo';

function stateOf(index: WizardStep, current: WizardStep): StepState {
  if (index < current) return 'done';
  return index === current ? 'cur' : 'todo';
}

/**
 * Главная в состоянии «нужно подключить устройство»: три шага вместо дашборда.
 * Шаги 1-2 человек подтверждает сам (серверного признака «приложение установлено» нет), шаг 3 закрывается
 * сам, когда в списке устройств появляется запись: хук состояния главной увидит это и покажет сводку.
 */
export default function WizardHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const { capabilities, backButton } = usePlatform();
  const { progress, update } = useWizardProgress();
  const connect = useConnect();
  const step = progress.step;
  const appName = connect.app?.name ?? '';
  const name = displayName(user);

  // Системная «Назад» Telegram возвращает на предыдущий шаг.
  const stepRef = useRef(step);
  stepRef.current = step;
  const goBack = useCallback(() => {
    const prev = Math.max(1, stepRef.current - 1) as WizardStep;
    update({ step: prev });
  }, [update]);
  useEffect(() => {
    if (!capabilities.hasBackButton || step <= 1) return;
    backButton.show(goBack);
    return () => backButton.hide();
  }, [backButton, capabilities.hasBackButton, goBack, step]);

  // Шаг 3: опрашиваем устройства, пока не пройдёт отведённое время.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (step !== 3) {
      setTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setTimedOut(true), POLL_LIMIT_MS);
    return () => window.clearTimeout(timer);
  }, [step]);

  const { isFetching, refetch } = useQuery({
    queryKey: ['devices'],
    queryFn: () => subscriptionApi.getDevices(),
    refetchInterval: step === 3 && !timedOut ? POLL_INTERVAL_MS : false,
    staleTime: 0,
  });

  const onInstall = () => {
    update({ step: 2 });
  };
  const onAdd = () => {
    if (connect.addSubscription()) {
      update({ step: 3 });
    } else {
      navigate('/connection');
    }
  };
  const onCheckNow = () => {
    setTimedOut(false);
    queryClient.invalidateQueries({ queryKey: ['subscription'] });
    refetch();
  };

  const dismiss = () => update({ dismissed: true });

  return (
    <div className="og">
      <div className="og-eyebrow">
        {name ? t('origami.wizard.eyebrow', { name }) : t('origami.wizard.eyebrowNoName')}
      </div>
      <h1 className="og-h1">{t('origami.wizard.title', { step })}</h1>

      {!connect.loading && !connect.configured ? (
        <div className="og-plate og-pad og-plate-fold" style={{ marginTop: 22 }}>
          <p className="og-sm">{t('origami.wizard.notConfigured')}</p>
          <Link to="/connection" className="og-btn og-btn-lg" style={{ marginTop: 16 }}>
            {t('origami.wizard.openConnection')}
          </Link>
        </div>
      ) : (
        <div className="og-rail">
          {/* Шаг 1 */}
          <div className={`og-step og-step-${stateOf(1, step)}`}>
            <div className="og-num">{step > 1 ? '✓' : 1}</div>
            <div className={`og-plate ${step === 1 ? 'og-pad og-plate-fold' : 'og-pad-sm'}`}>
              {step === 1 ? (
                <>
                  <div className="og-eyebrow">{t('origami.wizard.now')}</div>
                  <h2 className="og-h2">{t('origami.wizard.step1.title')}</h2>
                  <p className="og-sm" style={{ margin: '8px 0 18px' }}>
                    {t('origami.wizard.step1.text', { app: appName })}
                  </p>
                  {connect.installUrl ? (
                    <a
                      className="og-btn og-btn-lg"
                      href={connect.installUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onInstall}
                    >
                      {t('origami.wizard.step1.install', { app: appName })}
                    </a>
                  ) : (
                    <button type="button" className="og-btn og-btn-lg" onClick={onInstall}>
                      {t('origami.wizard.step1.already')}
                    </button>
                  )}
                  <div className="og-row og-row-start" style={{ marginTop: 14, gap: 20 }}>
                    {connect.installUrl && (
                      <button type="button" className="og-link" onClick={onInstall}>
                        {t('origami.wizard.step1.already')}
                      </button>
                    )}
                    <Link to="/add-device" className="og-link">
                      {t('origami.wizard.step1.other')}
                    </Link>
                  </div>
                </>
              ) : (
                <div className="og-row">
                  <h2 className="og-h2">{t('origami.wizard.step1.done')}</h2>
                  {appName && <span className="og-tag og-tag-ok">{appName}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Шаг 2 */}
          <div className={`og-step og-step-${stateOf(2, step)}`}>
            <div className="og-num">{step > 2 ? '✓' : 2}</div>
            <div className={`og-plate ${step === 2 ? 'og-pad og-plate-fold' : 'og-pad-sm'}`}>
              {step === 2 ? (
                <>
                  <div className="og-eyebrow">{t('origami.wizard.now')}</div>
                  <h2 className="og-h2">{t('origami.wizard.step2.title', { app: appName })}</h2>
                  <p className="og-sm" style={{ margin: '8px 0 18px' }}>
                    {t('origami.wizard.step2.text')}
                  </p>
                  <button type="button" className="og-btn og-btn-lg" onClick={onAdd}>
                    {t('origami.wizard.step2.add', { app: appName })}
                  </button>
                  <div className="og-row og-row-start" style={{ marginTop: 14, gap: 20 }}>
                    <button type="button" className="og-link" onClick={goBack}>
                      {t('origami.wizard.step2.notInstalled')}
                    </button>
                    <Link to="/add-device" className="og-link">
                      {t('origami.wizard.step2.qr')}
                    </Link>
                  </div>
                </>
              ) : (
                <h2 className="og-h2">
                  {step > 2
                    ? t('origami.wizard.step2.done')
                    : t('origami.wizard.step2.title', { app: appName })}
                </h2>
              )}
            </div>
          </div>

          {/* Шаг 3 */}
          <div className={`og-step og-step-${stateOf(3, step)}`}>
            <div className="og-num">3</div>
            <div className={`og-plate ${step === 3 ? 'og-pad og-plate-fold' : 'og-pad-sm'}`}>
              <h2 className="og-h2">{t('origami.wizard.step3.title')}</h2>
              {step === 3 ? (
                <>
                  <p className="og-sm" style={{ margin: '8px 0 14px' }}>
                    {t('origami.wizard.step3.text', { app: appName })}
                  </p>
                  {timedOut ? (
                    <div>
                      <p className="og-sm" style={{ marginBottom: 12 }}>
                        {t('origami.wizard.step3.slow')}
                      </p>
                      <div className="og-row og-row-start">
                        <Link to="/support" className="og-btn og-btn-sm">
                          {t('origami.wizard.step3.support')}
                        </Link>
                        <button
                          type="button"
                          className="og-btn og-btn-sm og-btn-ghost"
                          onClick={onCheckNow}
                        >
                          {t('origami.wizard.step3.check')}
                        </button>
                      </div>
                      <button type="button" className="og-link" onClick={() => update({ step: 2 })}>
                        {t('origami.wizard.step3.again')}
                      </button>
                    </div>
                  ) : (
                    <div className="og-row og-row-start" style={{ gap: 14 }}>
                      <span className="og-spin" aria-hidden="true" />
                      <span className="og-sm" role="status">
                        {t('origami.wizard.step3.waiting')}
                      </span>
                      <button
                        type="button"
                        className="og-btn og-btn-sm og-btn-ghost"
                        disabled={isFetching}
                        onClick={onCheckNow}
                      >
                        {t('origami.wizard.step3.check')}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="og-sm" style={{ marginTop: 6 }}>
                  {t('origami.wizard.step3.text', { app: appName })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="og-row og-row-start" style={{ marginTop: 26 }}>
        <button type="button" className="og-link" onClick={dismiss}>
          {t('origami.wizard.dismiss')}
        </button>
      </div>
    </div>
  );
}
