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

    <template>
      <TBaseModal :show="modalOpen" size="sm">
        <div class="p-6">
          <div>
            <div
                class="absolute top-0 right-0 mt-4 mr-4 text-main-500 dark:text-light-400 hover:text-main-600 dark:hover:text-light-500">
              <component :is="iconoir['Xmark']" class="h-6 w-6 cursor-pointer" @click="toggleModal()"/>
            </div>
            <div class="flex justify-center mb-4">
              <img src="/assets/icons/logo.png" alt="Teemii the Cat" class="h-12 w-12 rounded-full">
            </div>
            <h2 class="text-lg font-semibold text-center text-main-500 dark:text-light-400 mb-2">
              Purr-fect, you've warmed our hearts! 😻
            </h2>
            <p class="text-sm text-main-400 dark:text-light-500 text-center mb-4">
              Your support is invaluable to me and Teemii, the cat behind the scenes. Every donation helps us keep
              purring along, and we're always eager to hear your ideas in our discussions.
            </p>
          </div>
          <div class="flex justify-center gap-4 mx-4">
            <ul class="mt-4 space-y-4 text-sm leading-6 ">
              <li class="flex">
                <component :is="iconoir['ChatBubble']" class="text-main-400 dark:text-light-500 h-5 w-5"/>
                <a class="ml-5 tracking-tighter text-accent-400 dark:text-darkAccent-400 hover:text-accent-500
                   dark:hover:text-darkAccent-200" href="https://github.com/dokkaner/teemii/discussions"
                   target="_blank">
                  <strong class="font-semibold text-main-900 dark:text-light-100">Let your voice be heard</strong>&nbsp;
                  —
                  &nbsp;Join the discussions
                </a>
              </li>
              <li class="flex">
                <component :is="iconoir['Github']" class="text-main-400 dark:text-light-500 h-5 w-5"/>
                <a class="ml-5 tracking-tighter text-accent-400 dark:text-darkAccent-400 hover:text-accent-500
                   dark:hover:text-darkAccent-200" href="https://github.com/sponsors/dokkaner/" target="_blank">
                  <strong class="font-semibold text-main-900 dark:text-light-100">Sponsor us on Github</strong>&nbsp;
                  —
                  &nbsp;Let's build together!
                </a>
              </li>
              <li class="flex">
                <font-awesome-icon :icon="['fab', 'patreon']" class="text-main-400 dark:text-light-500 h-5 w-5"/>
                <a class="ml-5 tracking-tighter text-accent-400 dark:text-darkAccent-400 hover:text-accent-500
                   dark:hover:text-darkAccent-200" href="https://patreon.com/dokkaner" target="_blank">
                  <strong class="font-semibold text-main-900 dark:text-light-100">Become a Patron</strong>&nbsp; —
                  &nbsp;Join our creative journey!
                </a>
              </li>
              <li class="flex">
                <component :is="iconoir['CoffeeCup']" class="text-main-400 dark:text-light-500 h-5 w-5"/>
                <a class="ml-5 tracking-tighter text-accent-400 dark:text-darkAccent-400 hover:text-accent-500
                   dark:hover:text-darkAccent-200" href="https://ko-fi.com/dokkaner" target="_blank">
                  <strong class="font-semibold text-main-900 dark:text-light-100">
                    Offer kibbles on Ko-fi</strong>&nbsp; —&nbsp; Fuel our coding sessions!
                </a>
              </li>
            </ul>
          </div>
        </div>
      </TBaseModal>
    </template>

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
           href="https://x.com/TeamDokkaner" target="_blank">DOKKANER</a>
      </div>
      <div class="cursor-pointer text-red-600 dark:text-red-500 hover:animate-pulse dark:hover:animate-pulse"
           @click="toggleModal()">
        <span class="tracking-tighter">
          <component :is="iconoir['HeartSolid']" class="h-4 w-4 text-shadow shadow-main-900"/>
        </span>
      </div>
    </footer>
  </div>
</template>

<script>
import { ref } from 'vue'
import * as iconoir from '@iconoir/vue'
import NotificationRoot from '../components/notifications/NotificationRoot.vue'
import Sidebar from './Sidebar.vue'
import TBaseModal from '@/components/base/TBaseModal.vue'

export default {
  components: {
    TBaseModal,
    NotificationRoot,
    Sidebar
  },
  setup () {
    const sidebarOpen = ref(false)
    const modalOpen = ref(false)

    const toggleModal = () => {
      modalOpen.value = !modalOpen.value
    }
    return {
      toggleModal,
      modalOpen,
      iconoir,
      sidebarOpen
    }
  }
}
</script>
