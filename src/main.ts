import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { i18n } from './i18n'
import { initLocale } from './composables/useLocale'

initLocale()
createApp(App).use(i18n).mount('#app')
