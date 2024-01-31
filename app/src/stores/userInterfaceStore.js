import { useDark, useMediaQuery, useStorage, useToggle } from '@vueuse/core'
import { defineStore } from 'pinia'
import { locales, localesNames } from '@/scripts/i18n.js'

const viewMode = { fitMode: 0, pageMode: 2 }
/**
 * @typedef UserInterfaceStore
 * @type { actions | getters | state | import('pinia').Store }
 */
/**
 * @typedef useUserInterfaceStore
 * @type function
 * @param {import('pinia').Pinia | null | undefined} [pinia] - Pinia instance to retrieve the store
 * @param {import('pinia').StoreGeneric} [hot] - dev only hot module replacement
 * @returns UserInterfaceStore
 */
/**
 * @type useUserInterfaceStore
 */
export const useUserInterfaceStore = defineStore('theme', {
  state: () => {
    const readPreferences = useStorage('readerPreferences', {}, localStorage)

    const isDarkTheme = useDark()
    const toggleDark = useToggle(isDarkTheme)
    const isSmallScreen = useMediaQuery('(max-width: 700px)')
    const userLanguage = useStorage('language', 'en')
    // map locales with localesNames
    const languages = locales.map((locale, index) => ({
      code: locale,
      name: localesNames[index]
    }))
    return {
      readPreferences,
      languages,
      userLanguage,
      isDarkTheme,
      toggleDark,
      isSmallScreen,
      localesNames
    }
  }
})
