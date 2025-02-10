import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import globalComponents from './globalComponents'
import { createI18n } from 'vue-i18n'
import messages from './locales'

const i18nInstance = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(i18nInstance)
app.use(globalComponents)

export { app, pinia, i18nInstance as i18n }
