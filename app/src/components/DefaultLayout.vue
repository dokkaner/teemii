<template>
  <div class="flex flex-col min-h-screen">
    <Sidebar/>
    <main class="flex-1 md:pl-20">
      <NotificationRoot/>
      <TBaseDialog/>
      <div class="bg-light-200 dark:bg-darkMain-800">
        <slot/>
      </div>
    </main>
    <footer class="sticky bottom-0 z-10 flex justify-between p-4 bg-white/60 dark:bg-darkMain-800/60 backdrop-blur-xl">
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
  </div>
</template>

<script>
import { ref } from 'vue'
import NotificationRoot from '../components/notifications/NotificationRoot.vue'
import Sidebar from './Sidebar.vue'

export default {
  components: {
    NotificationRoot,
    Sidebar
  },
  setup () {
    const sidebarOpen = ref(false)

    return {
      sidebarOpen
    }
  }
}
</script>
