import i18n from 'i18next'

const resources = {}

const locales = ['de', 'en', 'es', 'fr', 'it', 'ja', 'pt', 'zh-CN']
const localesNames = ['Deutsch', 'English', 'Español', 'Français', 'Italiano', '日本語', 'Português', '中文']

locales.forEach(locale => {
  import(`./locales/${locale}/translation.json`).then((translations) => {
    resources[locale] = {
      translation: translations.default
    }
    i18n.addResourceBundle(locale, 'translation', translations.default)
  })
})

i18n.init({
  fallbackLng: 'en',
  resources,
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
export { locales, localesNames }