import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import HomeScreen from '@/pages/HomeScreen';
import '../styles/origami.css';
import '../styles/panel.css';
import PanelConnectSheet from './PanelConnectSheet';

/**
 * Маршрут `/add-device` в панели: обзор остаётся под шторой «Подключить устройство». Ссылки на этот адрес
 * (письма, `brand.js`) работают как раньше, а закрытие возвращает туда, откуда пришли, или на обзор.
 */
export default function PanelAddDevice() {
  const navigate = useNavigate();
  const { key } = useLocation();
  const close = useCallback(() => {
    // `default` - вход прямо на адрес шторы: истории внутри приложения нет.
    if (key === 'default') navigate('/', { replace: true });
    else navigate(-1);
  }, [key, navigate]);

  return (
    <>
      <HomeScreen />
      <PanelConnectSheet onClose={close} />
    </>
  );
}
