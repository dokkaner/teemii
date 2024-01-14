<template>
  <div class="container mx-auto">
    <TransitionRoot as="template" :show="selected.open">
      <Dialog
          as="div"
          class="fixed inset-0 z-40 overflow-hidden backdrop-blur-sm"
          @close="selected.open = false"
      >
        <div class="absolute inset-0 overflow-hidden">
          <TransitionChild
              as="template"
              enter="ease-out duration-300"
              enter-from="opacity-0"
              enter-to="opacity-100"
              leave="ease-in duration-200"
              leave-from="opacity-100"
              leave-to="opacity-0"
          >
            <DialogOverlay
                class="fixed inset-0 bg-main-500/75 transition-opacity"
            />
          </TransitionChild>
          <div
              class="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16"
          >
            <TransitionChild
                as="template"
                enter="ease-out duration-300"
                enter-from="translate-x-full"
                enter-to="translate-x-0"
                leave="ease-in duration-200"
                leave-from="translate-x-0"
                leave-to="translate-x-full"
            >
              <AddManga :media="selected"/>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
    <div
        class="sticky left-0 top-0 z-20 mx-auto mb-8 h-full w-full rounded-b-lg bg-white/80 px-8 backdrop-blur-xl transition-all duration-100 dark:bg-darkMain-800/80">
      <div class="w-full">
        <nav class="navbar flex w-full justify-center align-middle" aria-label="tabs">
          <div class="sm:hidden">
            <label for="tabs" class="sr-only">Select a tab</label>
            <select id="tabs" name="tabs" @change="toggleTabs($event.target.selectedIndex)"
                    class="block w-full rounded-md border-main-300 py-2 pl-3 pr-10 text-base
                    focus:border-accent-500 focus:outline-none focus:ring-accent-500 dark:border-darkLight-400 focus:dark:bg-darkAccent-500
                    focus:dark:ring-darkAccent-500 sm:text-sm">
              <option v-for="(tab, index) in tabs" :key="index" :selected="tab.current">{{ tab.name }}</option>
            </select>
          </div>
          <div class="hidden sm:block">
            <div class="border-b border-accent-200 dark:border-darkAccent-700">
              <nav class="-mb-px flex space-x-8" aria-label="Tabs">
                <a v-for="tab in tabs" :key="tab.name" href="#"
                   :class="[tab.current ? 'border-accent-500 text-accent-600 dark:border-darkAccent-400 dark:text-darkAccent-400' :
                    'border-transparent text-main-500 hover:border-accent-300 hover:text-main-700 dark:text-darkAccent-700 hover:dark:border-darkAccent-300 hover:dark:text-darkAccent-300',
                    'whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium']"
                   :aria-current="tab.current ? 'page' : undefined"
                   @click="toggleTabs(tab.index)"
                >
                  {{ tab.name }}
                </a>
              </nav>
            </div>
          </div>
        </nav>
      </div>
    </div>
    <div v-if="tabs[0].current">
      <div class="py-6 pl-2">
        <div class="text-2xl font-medium tracking-tight text-main-500 dark:text-light-400 sm:text-4xl">
          {{ t('search.add_manga') }}
        </div>
        <div class="mt-0.5 flex items-center pt-4 font-medium text-main-400 dark:text-light-500">
          {{ t('search.add_manga_sub') }}
        </div>
      </div>
      <div class="flex flex-1 justify-center px-2 pt-4 lg:justify-start">
        <div class="w-full rounded-xl border border-main-600 p-2 dark:border-none dark:p-0">
          <label for="search" class="sr-only">{{ t('general.search') }}</label>
          <div class="relative">
            <div
                class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-main-700 dark:text-light-400">
              <TBaseIcon :solid="true" name="MagnifyingGlassIcon" aria-hidden="true"
                         class="h-5 w-5"/>
            </div>

            <input id="search" name="search" :placeholder="t('general.search')" type="text" v-model="searchData.q"
                   autocomplete="off" @input="onInput" @keydown.down.prevent="onKeyDown"
                   @keydown.up.prevent="onKeyUp"
                   @keydown.enter.prevent="onEnter"
                   class="block w-full rounded-md bg-light-100 py-2 pl-10 pr-3 leading-5
                     placeholder:text-main-200 focus:border-white focus:bg-white
                     focus:text-main-600 focus:outline-none focus:ring-white dark:border-2
                     dark:border-darkAccent-400 dark:bg-darkMain-700
                     dark:text-light-100 dark:placeholder:text-darkLight-200
                     dark:focus:border-darkAccent-500 dark:focus:bg-darkMain-700
                     dark:focus:text-darkLight-50 dark:focus:ring-darkAccent-500 sm:text-sm"/>
            <ul v-if="suggestions.data?.length > 1"
                class="absolute z-10 mt-4 w-full space-y-1 rounded border border-main-300 bg-white/90 p-1
                  drop-shadow-lg backdrop-blur-2xl dark:border-none dark:bg-darkMain-500/80">
              <li v-for="(suggestion, index) in suggestions.data" :key="index"
                  class="flex cursor-pointer gap-x-4 rounded-sm px-4 py-1 transition duration-100 hover:bg-main-100 dark:hover:bg-darkMain-600"
                  :class="{ 'bg-light-400 dark:bg-darkAccent-500': index === activeIndex }"
                  @mousedown.prevent="selectSuggestion(suggestion)">
                <img class="h-[33px] w-[24px] flex-none rounded-sm" v-show="suggestion?.image"
                     :src="suggestion.image" :alt="suggestion.title" @error="imgPlaceholder"/>
                <div class="min-w-0">
                  <p class="text-left text-xs uppercase tracking-wider text-main-700 dark:text-light-500"
                     v-html="highlightMatch(suggestion)"></p>
                  <p class="mt-1 truncate text-xs tracking-tight text-main-400 dark:text-darkAccent-100">
                    {{ suggestion.synopsis }}</p>
                </div>
              </li>
            </ul>

          </div>
        </div>
      </div>
      <div v-if="searchData.correctedQuery && !searchData.loading"
           class="ml-2 mt-4 text-sm text-main-500 dark:text-light-400">
        <p>{{ t('search.results_for') }} <span class="font-medium text-main-800 dark:text-darkLight-200">{{
            searchData.correctedQuery
          }}</span></p>
        <p>{{ t('search.try_spelling') }} <a href="#" @click="searchForced(searchData.q)"
                                             class="text-accent-500 hover:underline dark:text-darkAccent-500">{{
            searchData.q
          }}</a></p>
      </div>

      <div v-if='searchData.loading' class="mx-auto h-full w-full justify-items-center">
        <img src="/assets/images/teemii_read.png" class="mx-auto h-[255px] w-[255px]" alt="logo" loading="lazy">
      </div>
      <!-- results -->
      <div v-if='!searchData.loading' class="container mx-auto">
        <TBaseGrid id="mangas" :key="gridKey">
          <TBasePosterCard v-for="(manga) in searchData.data" :key="manga.id"
                           :id="`manga-${manga.title.toUpperCase()}`"
                           :title="manga.title"
                           :image="manga.cover"
                           :tags="manga.genre"
                           :blur-poster="storeHelpers.isR18(manga.r, manga.genre)"
                           state="2"
                           variant="primary"
                           @click="showAddmanga(manga)"
          >
          </TBasePosterCard>
        </TBaseGrid>
      </div>
    </div>
    <div v-if="tabs[1].current">
      <div class="py-6 pl-2">
        <div class="text-2xl font-medium tracking-tight text-main-500 dark:text-light-400 sm:text-4xl">
          {{ t('search.import_title') }}
        </div>
        <div class="mt-0.5 flex items-center pt-4 font-medium text-main-400 dark:text-light-500">
          {{ t('search.import_title_sub') }}
        </div>
      </div>

      <div class="flex flex-1 justify-center px-2 lg:justify-start">
        <label type="button"
               class="group relative block w-full cursor-pointer rounded-lg border-2 border-dashed border-light-600 p-3
                text-center hover:border-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2
                hover:dark:border-darkAccent-400">

          <svg
              class="mx-auto h-8 w-8 text-main-900  group-hover:text-accent-600  dark:text-light-600 group-hover:dark:text-darkAccent-400"
              stroke="currentColor" fill="none"
              viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                  d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/>
          </svg>

          <span
              class="block text-sm text-main-900 group-hover:text-accent-600 dark:text-darkLight-50
              group-hover:dark:text-darkAccent-400">{{ t('search.click_here') }}</span>
          <input type='file' multiple @change="onFileChange" class="hidden"/>
        </label>
      </div>

      <section class="m-2" v-show="selectedFiles.files?.length > 0">
        <div class="grid max-w-7xl grid-cols-1 md:grid-cols-4">
          <div @click="showSelectMangaModal()"
               class="group cursor-pointer rounded-[0.625rem] p-[1.1875rem] transition-shadow group-hover:shadow-lg">
            <div v-if="selectedMangaForUpload">
              <img :src="selectedMangaForUpload.image" :alt="selectedMangaForUpload.title"
                   class="h-[300px] w-[200px] rounded-[0.625rem] object-cover group-hover:border-2
                   group-hover:border-accent-500 dark:group-hover:border-darkAccent-500">
              <div
                  class="mt-4 line-clamp-1 text-left text-xs font-medium uppercase tracking-widest text-main-700
                  transition duration-100 group-hover:text-accent-500 dark:text-light-400
                  dark:group-hover:text-darkAccent-500">
                {{ selectedMangaForUpload.title }}
              </div>
            </div>
            <div v-else>
              <div class="my-auto flex items-center justify-center"
                   v-show="selectedFiles.files?.length > 0 && !uploadSuggestions[0]">
                <svg class="-ml-1 mr-3 h-5 w-5 animate-spin text-main-600 dark:text-darkAccent-400"
                     xmlns="http://www.w3.org/2000/svg"
                     fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>
          </div>

          <div class="col-span-3">
            <div
                class="max-h-[20rem] w-full overflow-y-auto scrollbar-thin scrollbar-track-light-300 scrollbar-thumb-main-500">
              <div v-show="selectedFiles.files?.length > 0" v-for="(file, index) in selectedFiles.files" :key="index"
                   class="m-2 rounded-md bg-light-200 p-4 dark:bg-darkMain-500">
                <div class="flex items-center justify-between">
                  <TBaseIcon v-if="uploadStatus.data[index] && uploadStatus.data[index].status === 'success'"
                             :solid="false" name="CheckCircleIcon" aria-hidden="true"
                             class="h-4 w-4 items-start bg-accent-700"/>
                  <span class="flex truncate pr-3 text-xs font-medium text-main-500 dark:text-light-200">
                      {{ file.name }}
                    </span>
                  <button class="items-end text-main-600 hover:text-accent-500
                    dark:text-light-200 dark:hover:text-darkAccent-400" @click="removeFile(file)">
                    <component :is="heroIcons['XMarkIcon']" class="h-6 w-6 text-center"/>
                  </button>
                </div>
                <div v-if="uploadStatus.data[index] && uploadStatus.data[index].status !== 'success'"
                     class="relative mt-5 h-[4px] w-full rounded-lg bg-light-600">
                  <div class="absolute inset-x-0 h-full w-0 rounded-lg bg-accent-600"
                       :style="{ width: uploadStatus.data[index]?.percentage + '%' }"/>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="ml-2 flex justify-between border-t-[1px] border-t-main-100 pt-2 dark:border-t-darkAccent-700">
          <div class="flex items-center space-x-5">
            <div class="flow-root">
              <button type="button" @click="showSelectMangaModal()"
                      class="-m-2 inline-flex h-10 w-10 items-center justify-center rounded-full text-light-400
                       hover:text-main-500 dark:text-light-200 dark:hover:text-darkAccent-400">
                <span class="sr-only">Change the manga</span>
                <component :is="heroIcons['MagnifyingGlassIcon']" class="h-6 w-6 text-center"/>
              </button>
            </div>
          </div>
          <div v-show="selectedMangaForUpload" class="flex shrink-0">
            <div v-if="uploadStatus.status === 'uploading'"
                 class="mt-4 flex shrink-0 text-sm font-medium text-light-800">
              <span
                  class="relative -top-0.5 ml-2 rounded bg-main-900/90 px-2 py-0.5 text-xs font-medium text-light-200"> {{
                  selectedFiles.files?.length
                }} </span>
              <span
                  class="relative -top-0.5 ml-2 rounded bg-accent-600/90 px-2 py-0.5 text-xs font-medium text-light-200"> {{
                  uploadStatus.done
                }} </span>
              <span class="relative -top-0.5 ml-2 rounded bg-red-500/90 px-2 py-0.5 text-xs font-medium text-light-200"> {{
                  uploadStatus.errors
                }} </span>
            </div>
            <div v-else class="flex gap-x-2">
              <TBaseButton :rounded=true size="sm" variant="secondary" @click="clearAllUpload">
                {{ t('general.clear') }}
              </TBaseButton>
              <TBaseButton :rounded=true size="sm" variant="primary" @click="uploadFiles">
                {{ t('general.import') }}
              </TBaseButton>
            </div>
          </div>
        </div>
      </section>

      <template>
        <TBaseModal :show="modalSelectMangaActive" size="lg">
          <div class="h-full w-full rounded-lg bg-transparent px-4 pb-4 pt-5 text-left transition-all sm:my-8">
            <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
              <button type="button" @click="closeSelectMangaModal"
                      class="rounded-md bg-white text-main-400 hover:text-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2">
                <span class="sr-only">{{ t('general.close') }}</span>
                <component :is="heroIcons['XMarkIcon']" class="h-6 w-6 text-center"/>
              </button>
            </div>
            <div class="flex w-full">
              <div class="mx-auto mt-3 w-full overflow-hidden">
                <div class="text-base font-semibold leading-6 text-main-900">{{ t('search.select_manga') }}</div>
                <div class="mt-2 flex w-full justify-center px-2 pt-4 lg:justify-start">
                  <div class="w-full rounded-xl border border-main-600 p-2">
                    <label for="search" class="sr-only">{{ t('general.search') }}</label>
                    <div class="relative">
                      <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <TBaseIcon :solid="true" name="MagnifyingGlassIcon" aria-hidden="true"
                                   class="h-5 w-5 text-main-700"/>
                      </div>

                      <input id="searchUpload" name="search" placeholder="Search" type="text" v-model="searchUpload.q"
                             autocomplete="off" @keydown.enter="searchUploadMatch()"
                             class="block w-full rounded-md bg-light-100 py-2 pl-10 pr-3 leading-5 placeholder:text-main-200 focus:border-white focus:bg-white focus:text-main-600 focus:outline-none focus:ring-white sm:text-sm"/>
                    </div>
                  </div>
                </div>
                <section>
                  <div class="rounded-xl " v-if="uploadSuggestions.length>0">
                    <TBaseCarousel uID="mbup" :slides="uploadSuggestions" :selectable="true"
                                   @select="selectMangaForUpload"/>
                  </div>
                </section>

              </div>
            </div>
            <div class="mt-5 shrink gap-x-2 sm:mt-4 sm:flex sm:flex-row-reverse">
              <div class="shrink-0">
                <TBaseButton :rounded=true size="sm" variant="primary" @click="closeSelectMangaModal">
                  {{ t('general.select') }}
                </TBaseButton>
              </div>
              <div class="shrink-0">
                <TBaseButton :rounded=true size="sm" variant="secondary" @click="closeSelectMangaModal">
                  {{ t('general.cancel') }}
                </TBaseButton>
              </div>
            </div>
          </div>
        </TBaseModal>
      </template>
    </div>
  </div>
</template>

<script>
import { useTranslation } from 'i18next-vue'
import * as heroIcons from '@heroicons/vue/24/solid'
import { ChevronRightIcon } from '@heroicons/vue/24/solid'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import _ from 'lodash'
import { pageTitle } from '@/global.js'
import { Dialog, DialogOverlay, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import AddManga from '../components/addone.vue'
import libraryAPI from '@/api/library'
import storeHelpers from '@/stores/utils'
import TBaseModal from '../components/base/TBaseModal.vue'
import TBaseIcon from '@/components/base/TBaseIcon.vue'
import TBasePosterCard from '@/components/base/TBasePosterCard.vue'
import TBaseGrid from '@/components/base/TBaseGrid.vue'

export default {
  name: 'Search',
  components: {
    TBaseGrid,
    TBasePosterCard,
    TBaseIcon,
    TBaseModal,
    heroIcons,
    TransitionChild,
    TransitionRoot,
    Dialog,
    DialogOverlay,
    DialogTitle,
    AddManga,
    ChevronRightIcon
  },
  setup () {
    const { t } = useTranslation()
    const openTab = ref(0)
    const gridKey = ref(0)
    const uploadStatus = ref({ done: 0, total: 0, errors: 0, status: 'idle', data: [] })
    const selectedFiles = ref({ files: [], metadata: {}, manga: null })
    const selectedMangaForUpload = ref(null)
    const searchUpload = ref({ q: '', force: false, data: [], loading: false, correctedQuery: '' })
    const tabs = ref([
      { index: 0, name: t('search.search_online'), href: '#', current: true },
      { index: 1, name: t('search.import_manga'), href: '#', current: false }
    ])

    async function getUploadFileInfo () {
      if (selectedFiles.value.files.length > 0) {
        const response = await libraryAPI.uploadGetFileInfo(selectedFiles.value.files[0].name)
        if (response.success) {
          const { series } = response.body
          searchUpload.value.q = series
          await searchUploadMatch()
        }
      }
    }

    async function removeFile (file) {
      const temp = []
      for (const f of selectedFiles.value.files) {
        if (f.name !== file.name) {
          temp.push(f)
        }
      }
      selectedFiles.value.files = temp
      await getUploadFileInfo()
    }

    async function onFileChange (e) {
      selectedFiles.value.files = e.target.files
      await getUploadFileInfo()
    }

    async function searchUploadMatch () {
      await fetchSearch(searchUpload.value.q, false, searchUpload)
      selectedMangaForUpload.value = uploadSuggestions.value[0]
    }

    function showSelectMangaModal () {
      modalSelectMangaActive.value = true
    }

    function selectMangaForUpload (index) {
      selectedMangaForUpload.value = uploadSuggestions.value[index]
    }

    function closeSelectMangaModal () {
      modalSelectMangaActive.value = false
    }

    function toggleTabs (tabNumber) {
      tabs.value[openTab.value].current = false
      tabs.value[tabNumber].current = true
      openTab.value = tabNumber
    }

    const uploadSuggestions = computed(() => {
      return searchUpload.value.data.map((m) => {
        return {
          id: m.id,
          title: m.title,
          image: m.cover,
          tags: m.genre,
          state: 2,
          variant: 'primary',
          year: m.year,
          externalIds: m.externalIds,
          altTitles: m.altTitles,
          source: m.source
        }
      })
    })

    function clearAllUpload () {
      selectedFiles.value.files = []
      uploadStatus.value = { done: 0, total: 0, errors: 0, status: 'idle', data: [] }
      selectedMangaForUpload.value = null
    }

    function uploadFiles () {
      uploadStatus.value = {
        done: 0,
        total: selectedFiles.value.files.length,
        errors: 0,
        status: 'uploading',
        data: []
      }
      for (const file of selectedFiles.value.files) {
        uploadStatus.value.data.push({ percentage: 0, fileName: file.name, status: 'uploading' })
        libraryAPI.uploadCBx(selectedMangaForUpload.value, file, (progressEvent) => {
          uploadStatus.value.data.find((p) => p.fileName === file.name).percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        }).then((response) => {
          if (response?.status === 200) {
            uploadStatus.value.done++
            if (uploadStatus.value.done === uploadStatus.value.total) {
              uploadStatus.value.status = 'idle'
            }
            uploadStatus.value.data.find((p) => p.fileName === file.name).status = 'success'
          } else {
            uploadStatus.value.done++
            uploadStatus.value.errors++
            if (uploadStatus.value.done === uploadStatus.value.total) {
              uploadStatus.value.status = 'idle'
            }
            uploadStatus.value.data.find((p) => p.fileName === file.name).status = 'error'
          }
        })
      }
    }

    const route = useRoute()
    const searchData = ref({ q: '', force: false, data: [], loading: false, correctedQuery: '' })
    const suggestions = reactive({})
    const activeIndex = ref(0)
    const selected = reactive({ open: false, data: null })
    const modalSelectMangaActive = ref(false)
    searchData.value.q = route.params.q

    const search = () => {
      fetchSearch(searchData.value.q, false)
    }

    const searchForced = (query) => {
      fetchSearch(query, true)
    }

    const showAddmanga = (manga) => {
      selected.data = manga
      selected.open = true
    }

    const fetchSuggestions = _.debounce(async (query) => {
      const userQuery = {}
      userQuery.title = query
      userQuery.score = 100
      if (query?.length === 0) {
        suggestions.data = [userQuery]
        return
      }

      const response = await libraryAPI.getAutocomplete(query)
      if (!response.success) {
        suggestions.data = [userQuery]
        return
      }
      activeIndex.value = 0
      suggestions.data = [userQuery, ...response.body]
      // sort by score
      suggestions.data.sort((a, b) => {
        if (a.score > b.score) {
          return -1
        }
        if (a.score < b.score) {
          return 1
        }
        return 0
      })
    }, 90)

    const onInput = (event) => {
      fetchSuggestions(searchData.value.q)
    }

    onMounted(() => {
      if (searchData.value.q) {
        fetchSearch(searchData.value.q)
      }
    })
    const onKeyDown = () => {
      if (activeIndex.value < suggestions.data.length - 1) {
        activeIndex.value++
      }
    }

    const onKeyUp = () => {
      if (activeIndex.value > 0) {
        activeIndex.value--
      }
    }

    const onEnter = () => {
      if (suggestions.data.length > 0 && suggestions.data[activeIndex.value]) {
        selectSuggestion(suggestions.data[activeIndex.value])
      } else {
        search()
      }
    }

    const selectSuggestion = (suggestion) => {
      searchData.value.q = suggestion.title
      suggestions.data = []
      search()
    }

    async function fetchSearch (query, force = false, output = searchData) {
      output.value.loading = true
      try {
        const response = await libraryAPI.searchMangas(query, force)

        if (response.success) {
          gridKey.value += 1
          const body = Object.freeze(response.body)
          output.value.correctedQuery = body.correctedQuery
          output.value.data = body.results
        }
      } catch (error) {
        console.error(error)
      } finally {
        output.value.loading = false
      }
    }

    const splitSuggestion = (suggestion) => {
      if (!suggestion?.title || !searchData.value.q) {
        return { before: '', match: '', after: '' }
      }

      const queryIndex = suggestion.title.toLowerCase().indexOf(searchData.value.q.toLowerCase())
      if (queryIndex === -1) {
        return { before: '', match: '', after: suggestion.title }
      }

      const before = suggestion.title.substring(0, queryIndex)
      const match = suggestion.title.substring(queryIndex, queryIndex + searchData.value.q.length)
      const after = suggestion.title.substring(queryIndex + searchData.value.q.length)

      return { before, match, after }
    }

    function highlightMatch (suggestion) {
      const { before, match, after } = splitSuggestion(suggestion)
      return `${before}<strong>${match}</strong>${after} (${suggestion.score})`
    }

    function imgPlaceholder (e) {
      e.target.src = 'https://via.placeholder.com/24x33'
    }

    onMounted(() => {
      document.title = 'Teemii - Search'
      pageTitle.value = 'Search'
    })
    // expose
    return {
      t,
      imgPlaceholder,
      storeHelpers,
      gridKey,
      uploadStatus,
      clearAllUpload,
      uploadFiles,
      selectedMangaForUpload,
      selectMangaForUpload,
      closeSelectMangaModal,
      showSelectMangaModal,
      modalSelectMangaActive,
      uploadSuggestions,
      searchUploadMatch,
      searchUpload,
      selectedFiles,
      removeFile,
      onFileChange,
      // --
      tabs,
      toggleTabs,
      activeIndex,
      selectSuggestion,
      onKeyDown,
      onKeyUp,
      onEnter,
      onInput,
      searchData,
      heroIcons,
      search,
      searchForced,
      selected,
      showAddmanga,
      highlightMatch,
      suggestions
    }
  }
}
</script>
