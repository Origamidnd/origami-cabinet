# Origami Cabinet

Форк [Bedolaga Cabinet](https://github.com/BEDOLAGA-DEV/bedolaga-cabinet) (AGPL-3.0) для сервиса OrigamiVPN.
Базовая версия: upstream v1.80.1 (`a693d30`). Основная ветка форка: `origami`.

## Что меняем
Личный кабинет с мастером первого подключения: если у человека активная подписка или тест и нет подключённых устройств, главная ведёт по трём шагам (установить приложение, добавить подписку, проверить). В остальных случаях кабинет работает как обычно. Всё остальное остаётся стоковым.

## Принципы форка
- Минимум правок в стоковых файлах: новое кладём в отдельные каталоги и подключаем в нескольких точках, чтобы обновления апстрима сливались без конфликтов.
- Версии апстрима подтягиваем по тегам; раз в неделю workflow `upstream-sync` пробует слить свежий тег, прогоняет проверки и открывает pull request или issue с конфликтами.
- Исходники открыты по условиям AGPL-3.0.

## Обновление с апстрима вручную
```bash
git remote add upstream https://github.com/BEDOLAGA-DEV/bedolaga-cabinet.git
git fetch upstream --tags
git merge v<версия>
npm ci && npm run type-check && npm test && npm run build
```

## Где что лежит
Код форка живёт в `src/origami/`, в стоковых файлах только точки подключения.
- `home/` - выбор состояния главной (`homeState.ts` с тестами, `useHomeState.ts`) и экраны: сводка, продление.
- `wizard/` - мастер подключения и хранение его прогресса (localStorage и Telegram CloudStorage).
- `connect/` - платформа по User-Agent, рекомендуемое приложение, ссылки установки и добавления подписки.
- `pages/AddDevice.tsx` - экран «Добавить устройство» (маршрут `/add-device`).
- `shell/` - подпись «Меню» в шапке и переключатель нижней панели (`SHOW_MOBILE_BOTTOM_NAV`).
- `locales/` - тексты форка (ru, en), подмешиваются в i18next, стоковые словари не правятся.
- `styles/origami.css` - стили экранов.
Точки подключения в стоке: `pages/HomeScreen.tsx`, `App.tsx` (маршрут), `components/layout/AppShell/AppShell.tsx` и `AppHeader.tsx`.
