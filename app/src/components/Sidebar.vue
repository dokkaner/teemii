<template>
  <!-- Static sidebar for desktop -->
  <div class="z-40 hidden md:fixed md:inset-y-0 md:flex md:flex-col drop-shadow-lg">
    <div
        class="hidden h-full overflow-visible rounded-r-2xl bg-dark-500 md:block dark:bg-darkMain-800 ">
      <div class="flex flex-col items-center py-6">
        <img class="h-12 w-auto shrink-0" src="/assets/icons/logo.png" alt="Timy"/>

        <nav class="flex-1 mt-6 min-w-20" aria-label="desktop navigation">
          <ul role="list">
            <li v-for="item in navigation" :key="item.name">
              <router-link :to="item.href"
                           :class="[item.current ? 'border-l-2 border-accent-600 text-white dark:border-darkAccent-600 dark:text-darkAccent-100' : 'hover:text-light-600 dark:text-darkAccent-200', 'text-light-600 group flex shrink-0 flex-col items-center p-3 text-xs font-medium']"
                           :aria-current="item.current ? 'page' : undefined">
                <component :is="iconoir[item.icon]" v-if="isLoaded"
                           :class="[item.current ? 'text-light-500 dark:text-darkAccent-500' : 'text-light-300 group-hover:text-light-600 group-hover:dark:text-darkAccent-600', 'h-6 w-6']"
                           aria-hidden="true"/>
                <span class="mt-2">{{ item.name }}</span>
              </router-link>
            </li>
            <li v-if="manga">
              <div class="border-b border-light-500 dark:border-darkLight-500 mx-2 my-2"></div>
              <a :href="storeHelpers.getMangaHREF(manga)"
                 class="tooltip tooltip-right flex shrink-0 flex-col items-center" :data-tip="manga.canonicalTitle">
                <img :src="storeHelpers.getMangaCover(manga.id, 480, 720, 'cover')" alt="Manga cover"
                     class="h-18 w-12 rounded-md object-cover hover:border-2 hover:border-accent-500 dark:hover:border-darkAccent-400 shadow-md"/>
              </a>
            </li>
          </ul>
        </nav>

        <div class="absolute bottom-12 flex-1">
        <span
            :class="[isConnected ? 'tooltip-accent' : 'tooltip-error', 'tooltip tooltip-right relative flex h-2 w-2 cursor-pointer']"
            :data-tip="statusText">
          <span v-show="eventReceived"
                :class="[isConnected ? 'bg-green-400' : 'bg-red-400', 'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75']"></span>
          <span
              :class="[isConnected ? 'bg-green-500' : 'bg-red-500', 'relative inline-flex h-2 w-2 rounded-full']"></span>
        </span>
        </div>
      </div>
    </div>
  </div>


  <!-- Mobile menu -->
  <TransitionRoot as="template" :show="mobileMenuOpen">
    <Dialog as="div" class="fixed inset-0 z-40 flex md:hidden" @close="mobileMenuOpen = false">
      <TransitionChild as="template" enter="transition-opacity ease-linear duration-300" enter-from="opacity-0"
                       enter-to="opacity-100" leave="transition-opacity ease-linear duration-300"
                       leave-from="opacity-100" leave-to="opacity-0">
        <DialogOverlay class="fixed inset-0 bg-dark-500/75 dark:bg-darkMain-800"/>
      </TransitionChild>
      <TransitionChild as="template" enter="transition ease-in-out duration-300 transform"
                       enter-from="-translate-x-full" enter-to="translate-x-0"
                       leave="transition ease-in-out duration-300 transform" leave-from="translate-x-0"
                       leave-to="-translate-x-full">
        <div class="relative flex w-full max-w-xs flex-1 flex-col bg-dark-500 dark:bg-darkMain-800 pb-4 pt-5">
          <TransitionChild as="template" enter="ease-in-out duration-300" enter-from="opacity-0" enter-to="opacity-100"
                           leave="ease-in-out duration-300" leave-from="opacity-100" leave-to="opacity-0">
            <div class="absolute right-0 top-1 -mr-14 p-1">
              <button type="button"
                      class="flex h-12 w-12  items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-white"
                      @click="mobileMenuOpen = false">

                <component :is="heroIcons['XMarkIcon']" class="h-6 w-6 z-10 cursor-pointer text-light-100 shadow-box"/>
                <span class="sr-only">Close sidebar</span>

              </button>

            </div>
          </TransitionChild>
          <div class="flex shrink-0 items-center px-4 text-white tracking-widest font-semibold">
            <img class="h-8 w-auto mr-2" src="/assets/icons/logo.png" alt="Teemii"/>
            TEEMII
          </div>
          <div class="mt-5 h-0 flex-1 overflow-y-auto px-2">
            <nav class="flex h-full flex-col" aria-label="mobile navigation">
              <ul role="list">
                <li class="space-y-1">
                  <router-link v-for="item in navigation" :key="item.name" :to="item.href"
                               @click="mobileMenuOpen = false"
                               :class="[item.current ? 'bg-main-800 text-white' : 'text-main-100 hover:bg-main-800 hover:text-white', 'group flex items-center rounded-md px-3 py-2 text-sm font-medium']"
                               :aria-current="item.current ? 'page' : undefined">
                    <component :is="heroIcons[item.icon]"
                               :class="[item.current ? 'text-white' : 'text-main-300 group-hover:text-white', 'mr-3 h-6 w-6']"
                               aria-hidden="true"/>
                    <span>{{ item.name }}</span>
                  </router-link>
                </li>
                <li v-if="manga">
                  <div class="border-b border-light-500 mx-2 my-2"></div>
                  <a :href="storeHelpers.getMangaHREF(manga)" @click="mobileMenuOpen = false"
                     class="text-main-100 group flex items-center rounded-md px-3 py-2 text-sm font-medium">
                    <img :src="storeHelpers.getMangaCover(manga.id, 480, 720, 'cover')" alt="Manga cover"
                         class="h-8 w-6 rounded-md object-cover hover:border-2 hover:border-accent-500 shadow-md"/>
                    <span class="mx-2">{{ manga.canonicalTitle }}</span>
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </TransitionChild>
      <div class="w-14 shrink-0" aria-hidden="true">
        <!-- Dummy element to force sidebar to shrink to fit close icon -->
      </div>
    </Dialog>
  </TransitionRoot>

  <div
      class="sticky top-0 z-40 flex items-center gap-x-6 bg-dark-500/80 dark:bg-darkMain-800/80 backdrop-blur-xl
        px-4 py-4 shadow-sm sm:px-6 md:hidden">
    <button type="button" class="-m-2.5 p-2.5 text-white dark:text-light-400 lg:hidden" @click="mobileMenuOpen = true">
      <span class="sr-only">Open sidebar</span>
      <component :is="heroIcons['Bars3Icon']" class="h-6 w-6 z-10 cursor-pointer text-white shadow-box"/>
    </button>
    <div class="line-clamp-1 text-md uppercase text-white dark:text-light-400">{{ pageTitle }}</div>
  </div>
</template>

<script>
import { ref, onMounted, computed, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import * as heroIcons from '@heroicons/vue/24/outline'
import { useSocketStore } from '@/stores/socketsStore'
import { useMangaStore } from '@/stores/mangasStore'
import storeHelpers from '@/stores/utils'
import {
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import { pageTitle } from '@/global.js'
import {
  Dialog,
  DialogOverlay,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  TransitionChild,
  TransitionRoot
} from '@headlessui/vue'
import * as iconoir from '@iconoir/vue'
import { useTranslation } from 'i18next-vue'

export default {
  components: {
    Dialog,
    DialogOverlay,
    Menu,
    MenuButton,
    MenuItem,
    MenuItems,
    TransitionChild,
    TransitionRoot
  },
  setup () {
    const { i18next, t } = useTranslation()
    const router = useRouter()
    const previousRoutePath = ref('')
    const currentRoutePath = ref('')

    const navigation = ref([])

    watchEffect(() => {
      navigation.value = [
        { name: t('navigation.home'), href: '/', primary: true, icon: 'HomeSimple', current: false },
        { name: t('navigation.search'), href: '/search', primary: true, icon: 'Search', current: false },
        { name: t('navigation.collection'), href: '/mangas', primary: true, icon: 'BookStack', current: false },
        { name: t('navigation.activity'), href: '/activity', primary: true, icon: 'Activity', current: false },
        { name: t('navigation.sync'), href: '/integration', primary: true, icon: 'CloudSync', current: false },
        { name: t('navigation.settings'), href: '/settings', primary: false, icon: 'Settings', current: false }
      ]
    })

    const navTitle = ref('Home')
    const isLoaded = ref(false)
    const mobileMenuOpen = ref(false)

    const socketStore = useSocketStore()
    const storeIsLoading = computed(() => socketStore.getIsLoading)
    const isConnected = computed(() => socketStore.getIsConnected)
    const eventReceived = computed(() => socketStore.getNotificationReceived)
    const mangasStore = useMangaStore()
    const manga = computed(() => mangasStore.getLastManga)

    const statusText = computed(() => {
      if (storeIsLoading.value) {
        return t('navigation.backend_loading')
      } else if (isConnected.value) {
        return t('navigation.backend_running')
      } else {
        return t('navigation.backend_stopped')
      }
    })

    function updateNavigation () {
      navigation.value.forEach((item) => {
        item.current = item.href === currentRoutePath.value
        if (item.current) {
          navTitle.value = item.name
        }
      })
    }

    router.beforeEach((to, from, next) => {
      previousRoutePath.value = from.fullPath
      currentRoutePath.value = to.fullPath
      updateNavigation()
      next()
    })

    onMounted(() => {
      isLoaded.value = true
    })
    return {
      t,
      pageTitle,
      navTitle,
      XMarkIcon,
      storeHelpers,
      manga,
      statusText,
      iconoir,
      heroIcons,
      isLoaded,
      navigation,
      mobileMenuOpen,
      storeIsLoading,
      isConnected,
      eventReceived
    }
  }
}
</script>
