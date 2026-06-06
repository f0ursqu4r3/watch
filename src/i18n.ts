import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import de from './locales/de.json'
import ja from './locales/ja.json'
import ar from './locales/ar.json'

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, es, fr, de, ja, ar },
})

export function setI18nLanguage(code: string) {
  i18n.global.locale.value = code as 'en'
}
