<template>
  <div v-if="!storeIsLoading && isLoaded" class="flex">
    <TransitionRoot as="template" :show="mobileSidebarOpen">
      <Dialog as="div" class="relative z-50 lg:hidden" @close="mobileSidebarOpen = false">
        <TransitionChild as="template" enter="transition-opacity ease-linear duration-300" enter-from="opacity-0"
                         enter-to="opacity-100" leave="transition-opacity ease-linear duration-300"
                         leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-main-900/80"/>
        </TransitionChild>

        <div class="fixed inset-0 flex">
          <TransitionChild as="template" enter="transition ease-in-out duration-300 transform"
                           enter-from="-translate-x-full" enter-to="translate-x-0"
                           leave="transition ease-in-out duration-300 transform" leave-from="translate-x-0"
                           leave-to="-translate-x-full">
            <DialogPanel class="relative mr-16 flex w-full max-w-xs flex-1">
              <TransitionChild as="template" enter="ease-in-out duration-300" enter-from="opacity-0"
                               enter-to="opacity-100" leave="ease-in-out duration-300" leave-from="opacity-100"
                               leave-to="opacity-0">
                <div class="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button type="button" class="-m-2.5 p-2.5" @click="mobileSidebarOpen = false">
                    <span class="sr-only">Close sidebar</span>
                    <XMarkIcon class="h-6 w-6 text-white" aria-hidden="true"/>
                  </button>
                </div>
              </TransitionChild>
              <!-- Mobile -->
              <div class="flex grow flex-col gap-y-5 overflow-hidden bg-main-900 px-6 pb-2 ring-1 ring-white/10">
                <div class="m-4">
                  <nav class="mx-auto flex" aria-label="reader navigation">
                    <ul role="list" class="flex flex-1 flex-col gap-y-1.5">
                      <li class="flex items-center text-light-900">
                        <button v-show="prevChapter?.state === 3" @click="gotoPrevChapter"
                                class="button-nav">
                          <span class="sr-only">Previous chapter</span>
                          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fill-rule="evenodd"
                                  d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                                  clip-rule="evenodd"></path>
                          </svg>
                        </button>
                        <div class="chapter-title">
                          <span class="tooltip tooltip-top mx-auto w-36 truncate">{{ chapter.canonicalTitle }}</span>
                        </div>
                        <button v-show="nextChapter?.state === 3" @click="gotoNextChapter"
                                class="button-nav">
                          <span class="sr-only">Next chapter</span>
                          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fill-rule="evenodd"
                                  d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                                  clip-rule="evenodd"></path>
                          </svg>
                        </button>
                      </li>

                      <li class="m-2 mx-auto inline-flex text-light-900">
                        <TBaseRating v-model="chapter.userRating" :disabled="false" colorClass="bg-orange-400"
                                     sizeClass="rating-xs"
                                     @change="onUpdateChapter"/>
                      </li>
                    </ul>
                  </nav>

                  <div class="m-auto max-w-fit pt-2">
                    <div id="previewThumbDiv" class="grid max-h-[calc(100vh-4rem)] grid-cols-2 gap-2 overflow-y-auto"
                         ref="gridContainer">
                      <div v-for="item in pages" :key="item.id" :id="item.pageNumber"
                           class="cursor-pointer overflow-hidden rounded-lg">
                        <img class="h-auto max-w-full rounded-lg" :src="getPage(item.id)" :alt="item.pageNumber"
                             :id="`tb-${item.pageNumber}`"
                             :class="previewThumbClass(Number(item.pageNumber))"
                             @click="gotoPage(Number(item.pageNumber), false)">
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

    <div v-show="desktopSidebarOpen"
         class="hidden overflow-hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
      <div class="flex grow flex-col gap-y-5 overflow-y-auto bg-main-500 p-6 scrollbar-none">
        <div class="mx-auto flex shrink-0 items-center">
          <router-link :to="{ name: 'Manga', params: {id: manga?.id, page: 1} }">
            <p class="line-clamp-1 text-xs font-bold uppercase tracking-widest text-light-600 transition duration-100 hover:text-accent-500">
              {{ manga?.canonicalTitle }} </p>
          </router-link>
        </div>

        <nav class="mx-auto flex" aria-label="reader navigation">
          <ul role="list" class="flex flex-1 flex-col gap-y-1.5">
            <li class="flex items-center text-light-900">
              <button v-show="prevChapter?.state === 3" type="button" @click="gotoPrevChapter"
                      class="-m-1.5 flex flex-none items-center justify-center p-1.5 text-accent-600 hover:text-main-500">
                <span class="sr-only">Previous chapter</span>
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd"
                        d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                        clip-rule="evenodd"></path>
                </svg>
              </button>
              <div class="line-clamp-1 flex-auto text-xs font-medium tracking-tighter text-light-100">
                <div class="flex items-center gap-x-2.5 text-xs leading-5 text-main-400">
                  <span class="tooltip tooltip-top mx-auto w-36 truncate">{{ chapter.canonicalTitle }}
                  </span>
                </div>
              </div>
              <button v-show="nextChapter?.state === 3" type="button" @click="gotoNextChapter"
                      class="-m-1.5 flex flex-none items-center justify-center p-1.5 text-accent-600 hover:text-main-500">
                <span class="sr-only">Next chapter</span>
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd"
                        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                        clip-rule="evenodd"></path>
                </svg>
              </button>
            </li>
            <li class="mx-auto flex text-light-100">

            </li>
            <li class="mx-auto inline-flex text-light-900">
              <!-- Toolbar -->
              <div class="my-auto justify-center align-middle">
                <p class="mx-auto whitespace-nowrap text-xs text-white">{{ viewer.currentPage }} /
                  {{ viewer.totalPages }}</p>
              </div>
              <button @click="gotoPage(1)"
                      class="inline-flex h-8 w-8 items-center justify-center gap-x-2 rounded-full border border-transparent text-sm font-semibold text-white hover:bg-main-100 hover:text-accent-500 disabled:pointer-events-none disabled:opacity-50">
                <component :is="ArrowUpCircleIcon" class="mx-auto h-5 w-5" aria-hidden="true"/>
              </button>
              <button @click="changePageMode(viewer.pageMode)"
                      class="inline-flex h-8 w-8 items-center justify-center gap-x-2 rounded-full border border-transparent text-sm font-semibold text-white hover:bg-main-100 hover:text-accent-500 disabled:pointer-events-none disabled:opacity-50">
                <component :is="viewer.pageMode.icon" class="mx-auto h-5 w-5" aria-hidden="true"/>
              </button>
              <button @click="changeFitMode(viewer.fitMode)"
                      class="inline-flex h-8 w-8 items-center justify-center gap-x-2 rounded-full border border-transparent text-sm font-semibold text-white hover:bg-main-100 hover:text-accent-500 disabled:pointer-events-none disabled:opacity-50">
                <component :is="viewer.fitMode.icon" class="mx-auto h-5 w-5" aria-hidden="true"/>
              </button>
              <button @click="toggleFullScreen()"
                      class="inline-flex h-8 w-8 items-center justify-center gap-x-2 rounded-full border border-transparent text-sm font-semibold text-white hover:bg-main-100 hover:text-accent-500 disabled:pointer-events-none disabled:opacity-50">
                <component :is="ComputerDesktopIcon" class="mx-auto h-5 w-5" aria-hidden="true"/>
              </button>
              <span class="tooltip tooltip-bottom py-1 before:text-xs before:content-[attr(data-tip)]"
                    data-tip="your rating">

              <TBaseRating v-model="chapter.userRating" :disabled="false" colorClass="bg-orange-400"
                           sizeClass="rating-xs"
                           @change="onUpdateChapter"/>

              </span>

              <!-- End Toolbar -->
            </li>
          </ul>
        </nav>
        <div class="relative mx-auto max-h-full max-w-fit overflow-y-auto scrollbar-none">
          <div :class="{'hidden': !showTopGradient}"
               class="absolute left-0 top-0 z-10 h-10 w-full bg-gradient-to-b from-main-500 to-transparent"></div>
          <div id="previewThumbDiv"
               class="mx-auto grid max-h-full max-w-fit grid-cols-2 gap-2 overflow-y-auto scrollbar-none md:grid-cols-3"
               ref="gridContainer">
            <div v-for="item in pages" :key="item.id" :id="item.pageNumber"
                 class="cursor-pointer overflow-hidden rounded-lg">
              <img class="h-auto max-w-full rounded-lg" :src="getPage(item.id)" :alt="item.pageNumber"
                   :id="`tb-${item.pageNumber}`"
                   :class="previewThumbClass(Number(item.pageNumber))"
                   @click="gotoPage(Number(item.pageNumber), false)"
              >
            </div>
          </div>
          <div :class="{'hidden': !showBottomGradient}"
               class="absolute bottom-0 left-0 z-10 h-10 w-full bg-gradient-to-t from-main-500 to-transparent"></div>
        </div>
      </div>
    </div>

    <main :class="{ 'lg:ml-72': desktopSidebarOpen, 'grow': !desktopSidebarOpen }" class="flex-1">
      <div class="invisible px-4 sm:visible sm:px-6 lg:px-8">
        <div class="transition-width group relative h-full w-full flex-1 overflow-auto ">
          <div class="group fixed left-0 top-1/2 z-50" :class="{ 'translate-x-[280px]': desktopSidebarOpen }">
            <div @click="toggleSidebar()" class="cursor-pointer">
              <div class="flex w-8 items-center justify-center">
                <div class="flex h-6 w-6 rotate-0 flex-col items-center transition">
                  <div
                      class="h-3 w-1 translate-y-2.5 rounded-full bg-accent-500 duration-300 ease-in-out group-hover:-rotate-12"></div>
                  <div
                      class="h-3 w-1 -translate-y-2.5 rounded-full bg-accent-500 duration-300 ease-in-out group-hover:rotate-12"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top menu for mobile -->
      <div
          class="sticky top-0 z-40 flex w-full items-center gap-x-6 overflow-hidden bg-main-900 p-4 shadow-sm lg:hidden">
        <div class="absolute left-0 top-0 mb-1.5 flex h-0.5 w-full rounded-full bg-light-600/80">
          <div class="bg-accent-600/50"
               :style="{ width: Number(viewer.currentPage / viewer.totalPages * 100) + '%' }"></div>
        </div>
        <button type="button" class="-m-2.5 p-2.5 text-main-400" @click="mobileSidebarOpen = true">
          <span class="sr-only">Open sidebar</span>
          <Bars3Icon class="h-6 w-6" aria-hidden="true"/>
        </button>

        <router-link :to="{ name: 'Manga', params: { id: manga?.id, page: 1 } }"
                     class="line-clamp-1 text-xs font-bold uppercase tracking-widest text-light-600 hover:text-accent-500">
          {{ manga?.canonicalTitle }}
        </router-link>

        <div class="mx-auto mr-4 flex gap-x-4 text-white">
          <!-- Toolbar -->
          <button @click="gotoPage(1)" class="toolbar-button">
            <component :is="ArrowUpCircleIcon" class="h-5 w-5" aria-hidden="true"/>
          </button>
          <button @click="changePageMode(viewer.pageMode)" class="toolbar-button">
            <component :is="viewer.pageMode.icon" class="h-5 w-5" aria-hidden="true"/>
          </button>
          <button @click="changeFitMode(viewer.fitMode)" class="toolbar-button">
            <component :is="viewer.fitMode.icon" class="h-5 w-5" aria-hidden="true"/>
          </button>
          <!-- End Toolbar -->
        </div>
      </div>

      <div tabindex="0" id="viewer" class="relative flex h-full w-full items-center justify-center"
           @keydown.down.prevent="onKeyDown" @keydown.up.prevent="onKeyUp">
        <div class="grid grid-cols-1 overflow-auto">
          <!-- Only render one section based on the page mode -->
          <div id="divPageView"
               class="max-h-screen overflow-y-auto scrollbar-thin scrollbar-track-light-300 scrollbar-thumb-main-500">
            <section v-show="viewer.pageMode.id === 2">
              <div v-for="item in pages" :key="item.id" :id="`page-${item.pageNumber}`"
                   class="relative flex flex-col items-center">
                <Waypoint @change="onChange" :options="{ threshold: [0.30, 0.90] }"
                          class="invisible absolute left-0 z-10 -mt-48 h-96 text-xs">
                  {{ item.pageNumber }}
                </Waypoint>
                <page :index="item.pageNumber" :source="getPage(item.id)" :classDesc="viewer.class"
                      :lazyLoad="true"></page>
              </div>
              <div class="bg-white shadow sm:rounded-lg">
                <div class="px-4 py-5 sm:p-6">
                  <h3 class="text-base font-semibold leading-6 text-gray-900">End of {{
                      chapter.canonicalTitle
                    }}</h3>
                  <div class="mt-2 sm:flex sm:items-start sm:justify-between">
                    <div class="max-w-xl text-sm text-gray-500">
                      <p>By the way, what did you think of this chapter?</p>
                    </div>
                    <span class="tooltip tooltip-bottom py-1 before:text-xs before:content-[attr(data-tip)]"
                          data-tip="your rating">
                    <TBaseRating v-model="chapter.userRating" :disabled="false" colorClass="bg-orange-400"
                                 sizeClass="rating-md"
                                 @change="onUpdateChapter"/>
                    </span>
                    <div v-show="nextChapter?.state === 3" @click="gotoNextChapter"
                         class="mt-5 sm:ml-6 sm:mt-0 sm:flex sm:shrink-0 sm:items-center">
                      <button type="button"
                              class="inline-flex items-center rounded-md bg-accent-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500">
                        Next Chapter
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
          <div ref="pagesRef">
            <!-- double view -->
            <section v-show="viewer.pageMode.id === 1 && viewer.currItem?.pageNumber > 1" class="flex overflow-hidden">
              <!-- prev -->
              <div class="relative z-10 flex-1 cursor-pointer" @click="prevPage(2)">
                <div class="sticky top-0" :id="`page-${viewer.currItem?.pageNumber}`">
                  <page v-if="viewer.currItem" :index="viewer.currItem?.pageNumber"
                        :source="getPage(viewer.nextcurrItem?.id)"
                        :classDesc="viewer.class"
                        loading="lazy"></page>
                </div>
              </div>

              <!-- next -->
              <div class="relative z-10 flex-1 cursor-pointer" @click="nextPage(2)">
                <div class="sticky top-0" :id="`page-${viewer.currItem?.pageNumber}`">
                  <page v-if="viewer.nextcurrItem" :index="viewer.nextcurrItem?.pageNumber"
                        :source="getPage(viewer.currItem?.id)"
                        :classDesc="viewer.class"
                        loading="lazy"></page>
                </div>
              </div>
            </section>

            <section v-show="viewer.pageMode.id === 1 && viewer.currItem?.pageNumber === 1"
                     class="h-screen overflow-hidden">
              <div class="absolute right-0 top-0 z-10 w-1/2 cursor-pointer" @click="nextPage(1)"
                   :id="`page-${viewer.currItem?.pageNumber}`">
                <page :index="viewer.currItem?.pageNumber" :source="getPage(viewer.currItem?.id)"
                      :classDesc="viewer.class" loading="lazy"></page>
              </div>
            </section>

            <section v-show="viewer.pageMode.id === 0">
              <div class="absolute left-0 top-0 z-10 h-full w-1/2 cursor-pointer" @click="prevPage(1)"></div>
              <div class="absolute right-0 top-0 z-10 h-full w-1/2 cursor-pointer" @click="nextPage(1)"
                   :id="`page-${viewer.currItem?.pageNumber}`"></div>
              <page :index="viewer.currItem?.pageNumber" :source="getPage(viewer.currItem?.id)"
                    :classDesc="viewer.class"
                    loading="lazy"></page>
            </section>
          </div>
        </div>
      </div>
    </main>

    <div class="absolute right-0 top-0 z-50 h-screen items-center overflow-hidden"
         @mouseenter="showNavigator = true"
         @mouseleave="showNavigator = false">
      <div :class="{ 'translate-x-28': !showNavigator }"
           class="flex h-full flex-col space-y-2 overflow-auto bg-light-300/10  backdrop-blur-lg transition-all duration-700 ease-in-out ">
        <div v-for="n in (pagesCount-1)" :key="n" @click="gotoPage(n)"
             class="group mx-auto  mr-0.5 grow cursor-pointer items-center justify-center p-1 text-center text-xs font-bold text-light-100 opacity-100 hover:bg-accent-500"
             :class="pageNavBarClass(Number(n))"
        >
          <p class="flex h-full w-8 items-center justify-center text-lg opacity-0 group-hover:opacity-100"
             :class="pageNumberNavBarClass(Number(n))">{{ formatNumber(n) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import libraryAPI from '../api/library'
import { Waypoint } from 'vue-waypoint'
import page from '../components/page.vue'
import { useRoute } from 'vue-router'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from '@headlessui/vue'
import { useChapterStore } from '@/stores/chaptersStore.js'
import {
  ArrowUpCircleIcon,
  Bars3Icon, XMarkIcon,
  BookOpenIcon,
  RectangleStackIcon,
  DocumentIcon,
  ChevronUpDownIcon,
  MinusIcon,
  ArrowsPointingOutIcon,
  ComputerDesktopIcon
} from '@heroicons/vue/24/outline'
import { debounce } from 'lodash'
import router from '@/router'
import TBaseRating from '@/components/base/TBaseRating.vue'

const route = useRoute()

// UX - constants
const pageModes = [
  { name: 'single', id: 0, current: false, icon: DocumentIcon, hint: 'single page' },
  { name: 'double', id: 1, current: false, icon: BookOpenIcon, hint: 'double page' },
  { name: 'long-strip', id: 2, current: false, icon: RectangleStackIcon, hint: 'long strip' }
]
const fitModes = [
  { name: 'height', id: 0, current: false, icon: ChevronUpDownIcon, hint: 'fit height', class: 'mx-auto h-screen' },
  { name: 'width', id: 1, current: false, icon: MinusIcon, hint: 'fit width', class: 'mx-auto w-screen h-screen' },
  { name: 'both', id: 2, current: false, icon: ArrowsPointingOutIcon, hint: 'fit both', class: 'mx-auto w-screen' }
]

// UX - variables
const pagesRef = ref(null)
const mobileSidebarOpen = ref(false)
const desktopSidebarOpen = ref(true)
const showNavigator = ref(false)
const gridContainer = ref(null)
const showTopGradient = ref(false)
const showBottomGradient = ref(true)

// --- viewer settings
const viewer = reactive({})
viewer.pageMode = pageModes[2]
viewer.fitMode = fitModes[0]
viewer.class = 'lazyload mx-auto img'
viewer.currentPage = route.params.page || 1
viewer.progression = 0
viewer.currItem = {}
viewer.nextcurrItem = {}

// UX - functions
const checkScroll = () => {
  if (!gridContainer.value) return

  const container = gridContainer.value
  showTopGradient.value = container.scrollTop > 0

  const atBottom = container.scrollHeight - container.scrollTop <= container.clientHeight
  showBottomGradient.value = !atBottom
}

function formatNumber (number) {
  return number < 10 ? `0${number}` : number
}

function toggleSidebar () {
  desktopSidebarOpen.value = !desktopSidebarOpen.value
}

function pageNumberNavBarClass (n) {
  let classList
  if (n === Number(viewer.currentPage)) {
    classList = 'text-light-500 opacity-100'
  }

  return classList
}

function previewThumbClass (n) {
  let classList
  if (n === Number(viewer.currentPage)) {
    classList = 'border-4 border-accent-400'
  }

  // blur pages not yet read
  if (n > Number(viewer.currentPage)) {
    classList = classList + ' filter blur-sm'
  }

  return classList
}

function pageNavBarClass (n) {
  let classList
  if (n === Number(viewer.currentPage)) {
    classList = 'border-r-4 border-r-main-100 bg-light-800 text-main-900'
  } else if (n < Number(viewer.progression)) {
    classList = 'border-r-4 border-r-accent-400'
  } else {
    classList = 'border-r-4 border-r-light-600'
  }

  return classList
}

const computeClass = async () => {
  switch (viewer.fitMode.id) {
    case 0: // height
      viewer.class = 'img mx-auto h-screen'
      break
    case 1: // width
      viewer.class = 'img mx-auto w-screen'
      break
    case 2: // both
      viewer.class = 'img max-h-screen'
      break
    default:
      viewer.class = 'img'
  }
}

// Data - variables
const isLoaded = ref(false)
const chapterId = route.params.id
const chapterStore = useChapterStore()
const storeIsLoading = computed(() => chapterStore.getIsLoading)
const chapter = computed(() => chapterStore.getChapter)
const nextChapter = computed(() => chapterStore.getNextChapter)
const prevChapter = computed(() => chapterStore.getPreviousChapter)
const manga = computed(() => chapterStore.getManga)
const pages = computed(() => chapterStore.getPages)
const pagesCount = computed(() => chapterStore.getPagesCount)
let lastPageSent = -1

// Data - functions
const debouncedReadStatus = debounce((pageId, pageNum) => {
  if (lastPageSent === pageNum) return
  const payload = { mangaId: manga.value.id, slug: manga.value.slug, chapterId, chapterNum: chapter.value.chapter }

  libraryAPI.publishReadStatus(pageId, pageNum, payload).then((response) => {
    if (response.success) lastPageSent = pageNum
  })
}, 30)

const updateReadStatus = async () => {
  if (!viewer.currItem) { return }
  const readStatus = { pageId: viewer?.currItem?.id, pageNum: viewer.currentPage }
  debouncedReadStatus(readStatus.pageId, readStatus.pageNum)
}

async function onUpdateChapter () {
  const chapterUpdate = { userRating: chapter.value.userRating }
  await libraryAPI.postChapter(chapter.value.id, chapterUpdate)
}

function getPage (id) {
  return `/api/v1/pages/${id}`
}

const changePageMode = (current) => {
  let newMode = current.id + 1
  if (newMode > pageModes.length - 1) { newMode = 0 }
  viewer.pageMode = pageModes[newMode]
  computeClass()
  if (newMode === 2) {
    setTimeout(() => {
      gotoPage(viewer.currentPage)
    }, 2000)
  }
  focusOnViewer()
}

const changeFitMode = (current) => {
  let newMode = current.id + 1
  if (newMode > fitModes.length - 1) { newMode = 0 }
  viewer.fitMode = fitModes[newMode]
  computeClass()
  focusOnViewer()
}

const updateViewerPos = (p) => {
  lazyLoad(p)
  // ocr(pages.value[p - 1].id)
  viewer.currentPage = p
  viewer.currItem = pages.value[p - 1]
  viewer.nextcurrItem = pages.value[p]
  if (!viewer.nextcurrItem) { viewer.nextcurrItem = pages.value[p - 1] }
  if (p > viewer.progression) {
    viewer.progression = p
  }
}

function lazyLoad (page) {
  const dom = document.getElementById(`page-${page}`)
  if (!dom) return
  // find all image with data-src attribute
  const lazyImages = dom.querySelectorAll('img[data-src]')

  // for each image found
  lazyImages.forEach((img) => {
    const src = img.getAttribute('data-src')
    if (!src) return
    img.src = src
    img.onload = function () {
      img.removeAttribute('data-src')
    }
  })
}

async function gotoNextChapter () {
  const chapterId = nextChapter.value.id
  if (chapterId) {
    await router.push({
      name: 'Chapter', params: { id: chapterId, page: 1 }
    })
    await router.go(0)
  }
}

async function gotoPrevChapter () {
  const chapterId = prevChapter.value.id
  if (chapterId) {
    await router.push({
      name: 'Chapter', params: { id: chapterId, page: 1 }
    })
    await router.go(0)
  }
}

const prevPage = (delta) => {
  let p = parseInt(viewer.currentPage)
  p = p - delta || 1
  if (p < 2) { p = 1 }

  updateViewerPos(p)
}

const nextPage = async (delta) => {
  let p = parseInt(viewer.currentPage)
  p = p + delta || 1
  if (p > viewer.totalPages) { p = viewer.totalPages }

  updateViewerPos(p)
  await updateReadStatus()
}

async function onChange (waypointState) {
  if ((waypointState.going === 'IN' && waypointState.direction === 'UP') ||
      (waypointState.going === 'IN' && waypointState.direction === 'DOWN')) {
    const p = waypointState.el?.childNodes[0]?.data || 1

    updateViewerPos(p)
    await updateReadStatus()
    scrollTo('previewThumbDiv', `tb-${p}`)
  }
}

const gotoPage = (page, noScroll = false) => {
  if (viewer.pageMode.id < 2) {
    updateViewerPos(page)
    updateReadStatus()
    return
  }

  updateViewerPos(page)
  updateReadStatus()

  if (!noScroll) {
    scrollTo('previewThumbDiv', `tb-${page}`)
    scrollTo('divPageView', `page-${page}`)
  }
}

const scrollTo = (scrollerId, targetId) => {
  const scroller = document.getElementById(scrollerId)
  const target = document.getElementById(targetId)
  if (!target || !scroller) return
  const targetRect = target.getBoundingClientRect()
  const scrollerRect = scroller.getBoundingClientRect()
  const targetTop = targetRect.top - scrollerRect.top
  const targetBottom = targetRect.bottom - scrollerRect.top
  const scrollerCenter = scrollerRect.height / 2
  const targetCenter = (targetTop + targetBottom) / 2
  const scrollDelta = targetCenter - scrollerCenter
  scroller.scrollBy({ top: scrollDelta, behavior: 'smooth' })
}

const onKeyDown = () => {
  // case page mode: single
  if (viewer.pageMode.id === 0) {
    nextPage(1)
  } else if (viewer.pageMode.id === 1) {
    // case page mode: double
    if (viewer.currentPage % 2 === 0) {
      nextPage(2)
    } else {
      nextPage(1)
    }
  } else {
    // case page mode: long strip
    const scroller = document.getElementById('divPageView')
    scroller.scrollBy({ top: 100, behavior: 'smooth' })
  }
}

const onKeyUp = () => {
  // case page mode: single
  if (viewer.pageMode.id === 0) {
    prevPage(1)
  } else if (viewer.pageMode.id === 1) {
    // case page mode: double
    if (viewer.currentPage % 2 === 1) {
      prevPage(2)
    } else {
      prevPage(1)
    }
  } else {
    // case page mode: long strip
    const scroller = document.getElementById('divPageView')
    scroller.scrollBy({ top: -100, behavior: 'smooth' })
  }
}

const focusOnViewer = () => {
  const viewer = document.getElementById('viewer')
  viewer.focus()
}

function toggleFullScreen () {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else if (document.exitFullscreen) {
    document.exitFullscreen()
  }
}

// on mounted
onMounted(() => {
  chapterStore.fetchChapter(chapterId)

  chapterStore.fetchChapterPages(chapterId).then(() => {
    isLoaded.value = true
    viewer.totalPages = pagesCount.value
    viewer.currItem = pages.value[0]
    viewer.nextcurrItem = pages.value[1]
    viewer.pageId = pages.value[0].id
    viewer.progression = Math.round((chapter.value.readProgress * pagesCount.value) / 100)
    viewer.currentPage = route.params.page

    setTimeout(() => {
      gridContainer.value.addEventListener('scroll', checkScroll)
      checkScroll()
      lazyLoad(1)
      focusOnViewer()
      document.title = `${manga?.value.canonicalTitle} - ${chapter?.value.canonicalTitle}`
      if (viewer.currentPage > 1) gotoPage(viewer.currentPage, false)
    }, 1000)
  })
})

onUnmounted(() => {
  gridContainer.value.removeEventListener('scroll', checkScroll)
})
</script>
