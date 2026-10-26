import i18n from 'i18next';
import en from './locales/en.json';
import ru from './locales/ru.json';

/**
 * Тексты форка лежат в своих словарях и подмешиваются к стоковым ресурсам при первом импорте,
 * поэтому стоковые `ru.json` и `en.json` не меняются. Остальные языки получают русский текст через
 * `fallbackLng`.
 */
let registered = false;

export function registerOrigamiLocales(): void {
  // Без инициализированного i18next (изолированные тесты компонентов) регистрировать нечего.
  if (registered || typeof i18n.addResourceBundle !== 'function') return;
  registered = true;
  i18n.addResourceBundle('ru', 'translation', ru, true, false);
  i18n.addResourceBundle('en', 'translation', en, true, false);
}
