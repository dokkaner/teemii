import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useDark } from '@vueuse/core'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(useDark())

  return { isDark }
})
