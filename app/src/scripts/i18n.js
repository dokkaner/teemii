import i18n from 'i18next'

const resources = {}

const locales = ['en', 'fr']

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