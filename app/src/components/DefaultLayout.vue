<template>

  <Sidebar/>

  <main class="md:pl-20">

    <NotificationRoot/>
    <TBaseDialog/>

    <div>
      <slot/>
    </div>

    <footer class="sticky bottom-0 flex justify-between p-3 bg-white/60 backdrop-blur-xl">
      <div class="mx-auto text-xs text-main-600 shadow-2xl">

        <a class="tracking-tighter hover:text-accent-500" href="https://github.com/dokkaner/teemii">
          <font-awesome-icon :icon="['fab', 'github']" />
        </a> |
        <a class="tracking-tighter hover:text-accent-500" href="https://docs.teemii.io/">
          <font-awesome-icon :icon="['fas', 'life-ring']" />
        </a> |
        made with <font-awesome-icon :icon="['fas', 'paw']" class="text-red-500"/> by
        <a class="tracking-tighter text-[#406ba7] hover:text-accent-500" href="https://x.com/TeamDokkaner">DOKKANER</a>
      </div>
    </footer>
  </main>
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
