import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import '../styles/origami.css';
import '../styles/panel.css';
import PanelConnect from './PanelConnect';

/**
 * Маршрут `/add-device` в панели: отдельный экран подключения. Ссылки на этот адрес (письма, `brand.js`)
 * работают как раньше. «Назад» возвращает туда, откуда пришли, а при входе прямо по ссылке на обзор.
 */
export default function PanelAddDevice() {
  const navigate = useNavigate();
  const { key } = useLocation();
  const back = useCallback(() => {
    // `default` - вход прямо на этот адрес: истории внутри приложения нет.
    if (key === 'default') navigate('/', { replace: true });
    else navigate(-1);
  }, [key, navigate]);
  const done = useCallback(() => navigate('/devices'), [navigate]);

  return <PanelConnect onBack={back} onDone={done} />;
}
