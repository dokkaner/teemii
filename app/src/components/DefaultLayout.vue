<template>

  <Sidebar/>

  <main class="md:pl-20">

    <NotificationRoot/>
    <TBaseDialog/>

    <div>
      <slot/>
    </div>

    <footer class="sticky z-40 bottom-0 flex justify-between p-3 bg-white/60 dark:bg-darkMain-800/60 backdrop-blur-xl">
      <button @click="toggleDark()">

        <input type="checkbox" name="light-switch" v-model="isDark" class="light-switch sr-only"/>
        <label
            class="flex items-center justify-center cursor-pointer w-4 h-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600/80 rounded-full"
            for="light-switch">
          <svg class="w-4 h-4 dark:hidden" width="8" height="8" xmlns="http://www.w3.org/2000/svg">
            <path class="fill-current text-slate-400"
                  d="M7 0h2v2H7V0Zm5.88 1.637 1.414 1.415-1.415 1.413-1.414-1.414 1.415-1.414ZM14 7h2v2h-2V7Zm-1.05 7.433-1.415-1.414 1.414-1.414 1.415 1.413-1.414 1.415ZM7 14h2v2H7v-2Zm-4.02.363L1.566 12.95l1.415-1.414 1.414 1.415-1.415 1.413ZM0 7h2v2H0V7Zm3.05-5.293L4.465 3.12 3.05 4.535 1.636 3.121 3.05 1.707Z"/>
            <path class="fill-current text-slate-500" d="M8 4C5.8 4 4 5.8 4 8s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4Z"/>
          </svg>
          <svg class="w-4 h-4 hidden dark:block" width="8" height="8" xmlns="http://www.w3.org/2000/svg">
            <path class="fill-current text-slate-400"
                  d="M6.2 2C3.2 2.8 1 5.6 1 8.9 1 12.8 4.2 16 8.1 16c3.3 0 6-2.2 6.9-5.2C9.7 12.2 4.8 7.3 6.2 2Z"/>
            <path class="fill-current text-slate-500"
                  d="M12.5 6a.625.625 0 0 1-.625-.625 1.252 1.252 0 0 0-1.25-1.25.625.625 0 1 1 0-1.25 1.252 1.252 0 0 0 1.25-1.25.625.625 0 1 1 1.25 0c.001.69.56 1.249 1.25 1.25a.625.625 0 1 1 0 1.25c-.69.001-1.249.56-1.25 1.25A.625.625 0 0 1 12.5 6Z"/>
          </svg>
          <span class="sr-only">Switch to light / dark version</span>
        </label>

      </button>
      <div class="mx-auto text-xs text-main-600 dark:text-light-600 shadow-2xl">

        <a class="tracking-tighter hover:text-accent-500" href="https://github.com/dokkaner/teemii">
          <font-awesome-icon :icon="['fab', 'github']"/>
        </a> |
        <a class="tracking-tighter hover:text-accent-500" href="https://docs.teemii.io/">
          <font-awesome-icon :icon="['fas', 'life-ring']"/>
        </a> |
        made with
        <font-awesome-icon :icon="['fas', 'paw']" class="text-red-500"/>
        by
        <a class="tracking-tighter text-[#406ba7] dark:text-darkAccent-200 hover:text-accent-500"
           href="https://x.com/TeamDokkaner">DOKKANER</a>
      </div>
    </footer>
  </main>
</template>

<script>
import { ref } from 'vue'
import NotificationRoot from '../components/notifications/NotificationRoot.vue'
import Sidebar from './Sidebar.vue'
import { useDark, useToggle } from '@vueuse/core'

export default {
  components: {
    NotificationRoot,
    Sidebar
  },
  setup () {
    const sidebarOpen = ref(false)
    const isDark = useDark()
    const toggleDark = useToggle(isDark)

    return {
      toggleDark,
      isDark,
      sidebarOpen
    }
  }
}
</script>
