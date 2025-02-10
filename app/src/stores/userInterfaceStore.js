import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  const theme = ref('light')
  const sidebarOpen = ref(true)
  const modalOpen = ref(false)

  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  const toggleSidebar = () => {
    sidebarOpen.value = !sidebarOpen.value
  }

  const toggleModal = () => {
    modalOpen.value = !modalOpen.value
  }

  return {
    theme,
    sidebarOpen,
    modalOpen,
    toggleTheme,
    toggleSidebar,
    toggleModal
  }
})
