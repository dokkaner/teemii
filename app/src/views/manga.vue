<template>
  <div class="fixed bottom-0 right-0 z-50 h-16 w-16">
    <svg v-show="storeIsLoading" class="sticky h-5 w-5 animate-spin text-light-900"
         xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <path class="opacity-75 " fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      <circle class="opacity-25 shadow-sm" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
    </svg>
  </div>

  <div v-if="manga" :class="[modalActive ? 'blur-md' : 'blur-0']"
       class="relative mx-auto w-full overflow-visible">
    <template v-if="manga.bannerImage?.anilist || manga.bannerImage?.kitsu">
      <div class="relative w-full bg-contain bg-fixed bg-top bg-no-repeat md:py-12 lg:py-52"
           :style="{'backgroundImage': `url(${storeHelpers.getMangaCover(mangaId, 1440, 403, 'banner')})`}">
        <div
            class="absolute bottom-0 left-0 h-24 w-full bg-gradient-to-t from-white to-transparent dark:from-darkMain-800"></div>
      </div>
    </template>

    <div v-else class="sm:py-12 lg:py-24"></div>

    <section class="relative -mt-16 overflow-hidden md:-mt-24 lg:-mt-52">
      <div class="container mx-auto">
        <div
            class="z-10 rounded-t-xl border-t bg-gradient-to-b from-white/50
            to-white/10 backdrop-blur-xl dark:border-0 dark:from-darkMain-800/50 dark:to-darkMain-800/10 md:flex md:flex-wrap md:p-8">
          <figure class="relative md:w-2/5 md:shrink-0 md:grow-0 md:basis-auto lg:w-1/2">
            <div class="relative flex flex-col items-center ">
              <img :src="storeHelpers.getMangaCover(mangaId, 480,720, 'cover')" alt="cover"
                   class="z-50 hidden rounded-xl md:visible"
                   :style="{'box-shadow' : classCover}"
              >
              <img data-ambient :src="storeHelpers.getMangaCover(mangaId, 480, 720, 'cover')" alt="cover">

              <p class="z-40 -mt-8 line-clamp-1 overflow-hidden text-center text-xs font-medium tracking-tighter
               text-light-100 shadow-main-900 text-shadow-sm dark:text-light-400">
                {{ manga.primaryAltTitle }} - {{ manga.serialization }} {{ t('manga.published_by') }}
                {{ manga.publishers[0] }}
              </p>
            </div>

          </figure>

          <!-- Details -->
          <div class="p-8 md:w-3/5 md:basis-auto lg:w-2/4 xl:p-0">
            <div class="flex content-start align-middle">
              <TBaseRating v-model="mangaUserScore" :disabled="false" colorClass="bg-orange-400" sizeClass="rating-md"
                           @change="onUpdateManga"/>
              <div class="ml-auto flex space-x-2 text-light-400 dark:text-light-500">
                <div v-if="manga.readProgress > 0"
                     class="flex items-center space-x-1 rounded-xl bg-main-900/90 px-4 py-2">
                  <component :is="heroIcons['BookOpenIcon']" v-if="isLoaded" class="h-4 w-4"/>
                  <span class="text-xs text-light-200 shadow-main-900 text-shadow-sm">
                    {{ manga.readProgress }}%
                  </span>
                </div>
                <div v-if="manga.favoritesCount"
                     class="flex items-center space-x-1 rounded-xl bg-main-900/90 p-2">
                  <component :is="heroIcons['HeartIcon']" v-if="isLoaded" class="h-4 w-4"/>
                  <span class="text-xs text-light-200 shadow-main-900 text-shadow-sm">{{
                      formatNumber(manga.favoritesCount)
                    }}</span>

                  <component :is="heroIcons['StarIcon']" v-if="isLoaded" class="h-4 w-4"/>
                  <span class="text-xs text-light-200 shadow-main-900 text-shadow-sm">{{
                      Number(manga.score).toFixed(2)
                    }}</span>
                </div>
              </div>
            </div>

            <h1 class="line-clamp-1 h-0 pt-2 text-3xl font-bold uppercase tracking-wide text-main-500 dark:text-light-400 sm:h-12">
              {{ manga.canonicalTitle }}
            </h1>

            <div class="py-4">
              <div class="flex gap-x-2 overflow-y-auto whitespace-nowrap">
                <template v-if="manga.publicationDemographics">
                  <span
                      class="inline-flex items-center rounded-md bg-main-50/50 px-2 py-1
                      text-xs font-medium tracking-tight text-main-700 ring-1 ring-inset ring-main-600/20
                      dark:bg-darkLight-500/50 dark:text-light-400">
                    {{ manga.publicationDemographics }}
                  </span>
                </template>

                <template v-if="manga.contentRating">
                  <span :class="contentRatingClass(manga.contentRating)">
                    {{ manga.contentRating }}
                  </span>
                </template>

                <template v-if="manga.isLicensed">
                  <span
                      class="dart:text-accent-200 inline-flex items-center rounded-md bg-green-50/50 px-2 py-1 text-xs
                      font-medium tracking-tight text-green-700
                      ring-1 ring-inset ring-green-600/20 dark:bg-darkMain-500/50 dark:ring-0">
                    {{ t('manga.licensed') }}
                  </span>
                </template>

                <span v-for="(genre, index) in manga.genres.slice(0,4)" :key="index"
                      class="inline-flex items-center rounded-full bg-main-100/50 px-2 py-1 text-xs lowercase
                       tracking-tight text-main-800 dark:bg-darkMain-500/50 dark:text-light-400 dark:ring-0">
                    {{ genre }}
                </span>
              </div>
            </div>

            <div
                class="max-h-[15rem] overflow-y-auto scrollbar-thin scrollbar-track-light-300
                 scrollbar-thumb-main-500 scrollbar-track-rounded-xl scrollbar-thumb-rounded-xl">
              <article class="pb-8 pr-8 text-main-500 dark:text-light-400">
                <p v-html="storeHelpers.getMangaDescription(manga)"
                   class="hyphens-auto text-base leading-relaxed"></p>
              </article>
            </div>

            <div v-if="isLoaded" class="my-4 mr-4 sm:col-span-1">
              <div class="flex w-full gap-x-1 align-middle">
                <p class="text-sm font-medium text-light-800 dark:text-light-500">{{ t('manga.sources') }}</p>
                <div class="flex gap-x-2 rounded-md">
                  <button v-for="(source, index) in manga.sources" :key="index" type="button" :data-tip="source.name"
                          class="tooltip tooltip-top relative h-6 w-6 cursor-pointer rounded-full grayscale hover:grayscale-0">
                    <a :href="source.url" target="_blank">
                      <img :src="source.favicon" class="mx-auto h-4 w-4" :alt="source.name" @error="imgPlaceholder">
                    </a>
                  </button>
                </div>
              </div>
            </div>

            <div class="py-4">
              <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
                <dl class="col-span-1">
                  <dt class="text-sm font-medium text-light-800 dark:text-light-500">{{ t('manga.authors') }}</dt>
                  <dd v-for="(author, index) in manga.authors?.slice(0,1)" :key="index"
                      class="mt-1 text-sm text-main-900 dark:text-light-400">
                    {{ author }}
                  </dd>
                </dl>
                <dl class="col-span-1">
                  <dt class="text-sm font-medium text-light-800 dark:text-light-500">{{ t('manga.year') }}</dt>
                  <dd class="mt-1 text-sm text-main-500 dark:text-light-400">
                    {{ manga.startYear }} - {{ manga.endYear || manga.status }}
                  </dd>
                </dl>
                <dl class="col-span-1">
                  <dt class="text-sm font-medium text-light-800 dark:text-light-500">{{ t('manga.chapters') }}</dt>
                  <dd class="text-sm text-main-500 dark:text-light-400">
                    <span class="inline-flex items-center gap-x-1.5 rounded-md py-1">
                    <svg v-if="(ownedChapters < manga.chapterCount)" class="h-1.5 w-1.5 fill-red-500"
                         viewBox="0 0 6 6" aria-hidden="true">
                    <circle cx="3" cy="3" r="3"/>
                    </svg>
                    <svg v-else class="h-1.5 w-1.5 fill-green-500" viewBox="0 0 6 6" aria-hidden="true">
                    <circle cx="3" cy="3" r="3"/>
                    </svg>
                    {{ ownedChapters }} / {{ manga.chapterCount }}
                    </span>
                  </dd>
                </dl>
                <dl class="col-span-1">
                  <dt class="text-sm font-medium text-light-800 dark:text-light-500">{{ t('manga.space_used') }}</dt>
                  <dd class="mt-1 text-sm text-main-500 dark:text-light-400">{{ formatDiskSize }}</dd>
                </dl>
              </div>
            </div>

            <div v-if="isLoaded" class="my-4 sm:col-span-1">
              <div class=" w-full gap-x-1">
                <p class="flex text-sm font-medium text-light-800 dark:text-light-500">
                  <template v-if="lastChapters?.length > 0">
                    {{ t('manga.latest_release') }}
                    <span class="tooltip tooltip-top ml-1 h-6 w-6" :data-tip="averageReleaseIntervalTip(manga)">
                      <component :is="heroIcons['InformationCircleIcon']" class="h-5 w-5"/>
                    </span>
                  </template>
                  <template v-else>{{ t('manga.no_release') }}</template>
                </p>
              </div>

              <ul v-if="lastChapters?.length > 0" role="list" class="-ml-2 mt-1">
                <li v-for="chapter in lastChapters?.slice(0,5)" :key="chapter.id"
                    class="flex items-center py-2 text-main-500 dark:text-light-400">
                  <div class="mr-2 flex h-6 w-6 flex-none items-center justify-center">
                    <div class="h-2 w-2 rounded-full"
                         :class="useChapterDotStateClass(chapter.state)"/>
                  </div>

                  <p class="mr-2 line-clamp-1 grow text-sm leading-5">
                    <router-link v-if="chapter.state === 3" :to="storeHelpers.getChapterRouterTo(chapter)"
                                 class="font-medium hover:text-main-700 dark:hover:text-light-300">
                      {{ chapter.chapter }} - {{ chapter.titles?.en || chapter.titles?.fr || chapter.titles?.ru }}
                    </router-link>
                    <span v-else>
                      {{ chapter.chapter }} - {{ chapter.titles?.en || chapter.titles?.fr || chapter.titles?.ru }}
                    </span>
                  </p>

                  <time :datetime="chapter.readableAt" class="flex-none text-xs text-gray-500">
                    {{ formatDateTime(chapter.readableAt) }}
                  </time>
                </li>
              </ul>

              <p v-else class="mt-1 text-sm text-main-500 dark:text-light-600">
                {{ t('manga.no_chapters') }}
              </p>
            </div>

            <!-- Actions -->
            <div class="mx-auto my-6 flex overflow-y-visible">
              <div class="relative w-full min-w-0 flex-col break-words rounded-2xl bg-clip-border">
                <div class="-mx-3 flex items-center">

                  <TBaseButton :rounded="true" size="sm" variant="primary" @click="continueReading()">
                    {{ t('manga.continue_reading') }}
                  </TBaseButton>

                  <div class="flex w-4/5 justify-start px-3">
                    <span class="flex gap-x-2 rounded-md">
                      <template
                          v-for="(action, index) in [{ tip: t('general.bookmark'), click: switchBookmark, condition: manga.bookmark, icon: 'BookmarkIcon' }, { tip: t('general.mark_as_read'), click: switchReaded, condition: manga.readed, icon: 'EyeIcon' }, { tip: t('general.monitor'), click: switchMonitor, condition: manga.monitor, icon: 'CheckBadgeIcon' }]"
                          :key="index">
                        <button type="button" :data-tip="action.tip" @click="action.click"
                                class="tooltip tooltip-top relative inline-flex cursor-pointer items-center rounded-md
                                p-1 shadow-sm hover:bg-accent-700 hover:text-accent-100
                                focus-visible:outline focus-visible:outline-2
                                focus-visible:outline-offset-2 focus-visible:outline-accent-600
                                dark:bg-darkLight-500 dark:text-darkAccent-400
                                dark:hover:bg-darkAccent-700 dark:hover:text-darkLight-50
                                dark:focus-visible:outline-darkAccent-500"
                                :class="{'text-accent-500 dark:text-darkAccent-400': action.condition, 'text-main-300 dark:text-light-600 ': !action.condition}">
                          <component class="h-5 w-5" :is="heroIcons[action.icon]"/>
                        </button>
                      </template>
                    </span>
                  </div>

                  <div class="basis-1/3 px-3 text-right">
                    <TBaseDropDownMenu iconOnly>
                      <TBaseMenuItem :menuClick="() => removeManga()" caption="Delete this manga" icon="TrashIcon"/>
                    </TBaseDropDownMenu>
                  </div>
                </div>
              </div>
            </div>

            <!-- end actions -->
          </div>
          <!-- end details -->
        </div>
      </div>
    </section>
    <div class="relative flex justify-center border-b border-light-400 pt-12 dark:border-none sm:pt-1">
    </div>

    <section class="relative overflow-visible">
      <div class="mx-auto">
        <!-- Tabs -->
        <div class="scrollbar-custom w-full overflow-x-auto rounded-xl bg-white p-8 dark:bg-darkMain-700">
          <TBaseTabGroup class="min-h-[300px]" vAlign="center" @change="onTabChange">
            <TBaseTab :title="t('manga.chapters')" icon="BookOpenIcon" :index=0 :count="pagination.totalItems">
              <div v-if="chaptersCount < 1">
                <div class="container mx-auto">
                  <section class="mx-auto max-w-7xl px-4">
                    <div class="mx-auto w-full text-center lg:w-2/3">
                      <p class="mb-3 text-xl font-bold text-main-900 md:text-2xl">Meh'</p>
                      <p class="mb-3 text-lg font-medium text-main-700">
                        {{ t('empty.no_chapters') }}
                      </p>
                    </div>
                  </section>
                  <div class="mx-auto h-full w-full justify-items-center">
                    <img src="/assets/images/nochapter.png" class="mx-auto h-[255px] w-[255px]" alt="no chapter">
                  </div>
                </div>
              </div>
              <div v-else>
                <div class="mb-8 md:flex md:items-center md:justify-between">
                  <div class="flex flex-1 justify-center px-2 lg:ml-6 lg:justify-end">
                    <TBaseInput placeholder="Filter chapters" iconLeft="MagnifyingGlassIcon"
                                @change="onChapterSearch()" v-model="pagination.searchTerm">
                    </TBaseInput>
                  </div>
                </div>

                <TBaseGrid id="chapters">
                  <TBaseCard
                      v-for="chapter in chaptersPaginated(pagination.currentPage, pagination.perPageItems, pagination.searchTerm).data"
                      :isSelected=false
                      :key="chapter.chapter"
                      :to="storeHelpers.getChapterRouterTo(chapter)"
                      :headerText="'c.' + chapter.chapter + (chapter.volume ? ' vol.' + chapter.volume: '')"
                      :title="chapter.titles.en || chapter.titles.fr || chapter.titles.ru"
                      :progressCaption="chapter.pages ? (chapter.readProgress * chapter.pages / 100).toFixed(0) + ' / ' + chapter.pages + ' pages' : ((chapter.job?.progress?.value > 0) && (chapter.job?.progress?.value < 100)) ? 'Downloading ... ' + chapter.job?.progress?.value + '%' : '&nbsp;'"
                      :image="storeHelpers.getChapterCoverPage(chapter.id, chapter.state)"
                      :contentLoading="(chapter.state === 1 || chapter.state === 2)"
                      :loading="Number(chapter.job?.progress?.value)"
                      :progression="chapter.readProgress"
                      :iconContentLoading="chapter.state === 1 ? 'DocumentSearchIcon' : 'DownloadIcon'"
                      :actions="[null, () => userDownloadChapter(chapter, null), () => showChapterModal(chapter)]"
                      :score="chapter.userRating"
                      :state="chapter.state"
                      :error="chapter.job?.error?.message"
                  >
                  </TBaseCard>
                </TBaseGrid>

                <!--  start of pagination -->
                <TBasePagination v-if="pagination" anchor="#chapters" :pagination="pagination"
                                 @pageChange="pageChange"></TBasePagination>
                <!--  end of pagination -->
              </div>
            </TBaseTab>
            <TBaseTab :title="t('manga.characters')" icon="UserGroupIcon" :index=1>
              <div v-show="storeIsLoading" class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                <TBaseProfilCard v-for="index in 10" :key="index" :contentLoading="true">
                </TBaseProfilCard>
              </div>

              <div v-show="!storeIsLoading" class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                <TBaseProfilCard v-for="character in characters" :key="character.id"
                                 :name="character.name?.userPreferred"
                                 :title="character.name.alt[0]"
                                 :image="character.image"
                                 :role="character.role"
                                 :desc="character.desc"
                >
                </TBaseProfilCard>
              </div>
            </TBaseTab>

            <TBaseTab :title="t('manga.recommendations')" icon="LightBulbIcon" :index=2>
              <section class="px-1 pb-4 sm:px-4">
                <TBaseCarousel uID="mbs" :slides="suggestions" :contentLoading="storeIsLoading"/>
              </section>
            </TBaseTab>
          </TBaseTabGroup>
        </div>

        <!-- end tabs -->

      </div>
      <template>
        <TBaseModal :show="modalActive" size="lg">
          <template #header>
            <div class="flex w-full overflow-y-auto whitespace-nowrap">
              <div class="flex flex-wrap items-center justify-between sm:flex-nowrap">
                <h3 class="mr-2 text-xs font-medium uppercase tracking-widest text-main-400 dark:text-darkLight-50">
                  {{ manga.canonicalTitle }} - {{ selectedChapter.chapter }}
                  {{ selectedChapter.titles.en_us }}
                </h3>
                <div v-if="selectedChapter.state !== 3"
                     class="inline-flex items-center rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-600
                    dark:bg-red-100 dark:text-red-600">
                  {{ t('general.missing') }}
                </div>
                <div v-else class="inline-flex gap-x-2">
                  <span class="inline-flex items-center rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700
                  dark:bg-green-100 dark:text-green-700">
                    {{ t('general.downloaded') }}
                  </span>
                  <span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-main-700
                    dark:text-darkLight-300">
                  <component :is="heroIcons['BookOpenIcon']"
                             class="m-1 h-3 w-3 cursor-pointer text-main-500 dark:text-darkAccent-400"
                  />
                  {{ selectedChapter.pages }} {{ t('general.pages') }}
                  </span>
                  <span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-main-700
                    dark:text-darkLight-300">
                  <component
                      :is="heroIcons['LanguageIcon']"
                      class="m-1 h-3 w-3 cursor-pointer text-main-500 dark:text-darkAccent-400"
                  />
                    {{ selectedChapter.dlSource?.lang?.toUpperCase() }}
                  </span>
                  <span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-main-700
                   dark:text-darkLight-300">
                    <component :is="heroIcons['FolderIcon']"
                               class="m-1 h-3 w-3 cursor-pointer text-main-500 dark:text-darkAccent-400"
                    />
                    {{ selectedChapter.dlSource?.local }}
                  </span>
                </div>
              </div>
            </div>
            <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
              <component
                  :is="heroIcons['XMarkIcon']"
                  class="h-6 w-6 cursor-pointer text-main-500 dark:text-darkAccent-400"
                  @click="closeChapterModal()"
              />
            </div>
          </template>

          <div class="mx-6 mb-6 flow-root dark:bg-darkMain-800">
            <div
                class="max-h-96 overflow-auto scrollbar-thin scrollbar-track-light-300 scrollbar-thumb-main-500">
              <table class="min-w-full divide-y divide-darkMain-300" aria-describedby="sources list">
                <thead class="text-xs dark:bg-darkMain-800 dark:text-light-500">
                <tr class="h-[48px]">
                  <th scope="col" class="border-main-300 dark:border-none">{{ t('manga.source') }}</th>
                  <th scope="col" class="hidden sm:table-cell">{{ t('manga.group_scan') }}</th>
                  <th scope="col" class="">{{ t('manga.language') }}</th>
                  <th scope="col" class="hidden sm:table-cell">{{ t('general.votes') }}</th>
                  <th scope="col" class="hidden sm:table-cell">{{ t('general.pages') }}</th>
                  <th scope="col" class="">{{ t('general.title') }}</th>
                  <th scope="col" class="hidden sm:table-cell">{{ t('general.version') }}</th>
                  <th scope="col" class="hidden sm:table-cell">{{ t('activity.last_updated') }}</th>
                  <th scope="col" class=""></th>
                  <th scope="col" class=""></th>
                </tr>
                </thead>
                <tbody class="mx-3 text-xs dark:text-light-400">
                <tr v-for="(data, index) in selectedChapter.metadata" :key="index"
                    class="group h-[32px] hover:rounded-lg hover:bg-main-50 dark:hover:bg-darkAccent-700">
                  <td class="">{{ data.source }}</td>
                  <td class="hidden sm:table-cell">{{ data.groupScan }}</td>
                  <td>{{ data.lang?.slice(0, 2) }}</td>
                  <td class="hidden sm:table-cell">{{ data.votes }}</td>
                  <td class="hidden sm:table-cell">{{ data.pages }}</td>
                  <td>{{ data.title }}</td>
                  <td class="hidden sm:table-cell">{{ data.version }}</td>
                  <td class="hidden sm:table-cell">{{ formatDateTime(data.lastUpdated) }}</td>
                  <td>
                    <component v-if="data.id === selectedChapter.dlSource?.id" :is="heroIcons['CheckIcon']"
                               class="h-4 w-4 cursor-pointer text-main-500 dark:text-darkAccent-400"/>
                  </td>
                  <td>
                    <component :is="heroIcons['ArrowDownTrayIcon']"
                               class="h-4 w-4 cursor-pointer text-accent-500 dark:text-darkAccent-400"
                               @click="userDownloadChapter(selectedChapter, data.id)"/>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>
        </TBaseModal>
      </template>
    </section>

  </div>

</template>

<script>
import { useTranslation } from 'i18next-vue'
import { useMangaStore } from '@/stores/mangasStore'
import { useDialogStore } from '@/stores/dialogsStore'
import { useNotificationStore } from '@/stores/notificationsStore'
import * as heroIcons from '@heroicons/vue/24/solid'
import { onMounted, ref, reactive, computed } from 'vue'
import { useRoute } from 'vue-router'
import router from '../router'
import { TransitionChild, TransitionRoot, Dialog, DialogOverlay, DialogTitle } from '@headlessui/vue'
import AddManga from '../components/addone.vue'
import TBaseModal from '../components/base/TBaseModal.vue'
import Ambient from '../scripts/ambient.min.js'
import helpers from '@/utils/helpers'
import storeHelpers from '@/stores/utils'
import style from '@/utils/style'
import Fuse from 'fuse.js'
import libraryAPI from '@/api/library'
import TBaseButton from '@/components/base/TBaseButton.vue'
import { pageTitle } from '@/global.js'
import TBaseMenuItem from '@/components/base/TBaseMenuItem.vue'
import TBaseDropDownMenu from '@/components/base/TBaseDropDownMenu.vue'
import { useChapterDotStateClass } from '@/composables/useUXHelpers'

export default {
  name: 'Manga',
  components: {
    TBaseDropDownMenu,
    TBaseMenuItem,
    TBaseButton,
    heroIcons,
    AddManga,
    TransitionChild,
    TransitionRoot,
    Dialog,
    DialogOverlay,
    DialogTitle,
    TBaseModal
  },
  props: ['id'],
  setup () {
    const { t } = useTranslation()
    // #region new pinia implementation
    const route = useRoute()
    const mangaId = route.params.id

    const pagination = reactive({})
    pagination.currentPage = route.params.page || 1
    pagination.perPageItems = 20
    pagination.limit = 10
    pagination.searchTerm = ''

    const dialogStore = useDialogStore()
    const mangasStore = useMangaStore()
    const notificationsStore = useNotificationStore()
    const storeIsLoading = computed(() => mangasStore.getIsLoading)
    const manga = computed(() => mangasStore.getManga)
    const characters = computed(() => mangasStore.getCharacters)
    const diskSize = computed(() => mangasStore.getDiskSize)
    const suggestions = computed(() => mangasStore.getSuggestions)
    const mangaChapters = computed(() => mangasStore.getMangaChapters)
    const chaptersCount = computed(() => mangasStore.getMangaChapterCount)
    const lastChapters = computed(() => mangasStore.getMangaLastPublishedChapters)
    const ownedChapters = computed(() => mangasStore.getOwnedChapters)

    function imgPlaceholder (e) {
      e.target.src = 'https://via.placeholder.com/24x24'
    }

    function continueReading () {
      const lastChapter = mangaChapters.value.find((chapter) => chapter.chapter === manga.value.readStatus.lastChapter)
      if (lastChapter.id) {
        router.push({
          name: 'Chapter', params: { id: lastChapter.id, page: manga.value.readStatus.lastPage }
        })
      }
    }

    function onTabChange (data) {
      if (data.index === 1) {
        mangasStore.fetchCharacters(mangaId)
      } else if (data.index === 2) {
        mangasStore.fetchSuggestions(manga, true)
      }
    }

    async function updatePagination () {
      pagination.count = chaptersCount.value
      pagination.totalCount = chaptersCount.value
      pagination.totalPages = Math.ceil(chaptersCount.value / pagination.perPageItems)
    }

    // computed
    const formatDiskSize = computed(() => {
      return helpers.formatBytes(diskSize.value)
    })

    const formatDateTime = (date) => {
      const options = { year: 'numeric', month: 'long', day: 'numeric' }
      const locales = navigator.languages || navigator.language || 'en-US'
      try {
        return new Date(date).toLocaleDateString(locales, options) || '?'
      } catch (e) {
        return '?'
      }
    }

    const formatNumber = (number) => {
      return helpers.humanizeNumber(number)
    }

    const onChapterSearch = async () => {
      pagination.currentPage = 1

      await router.push({
        name: 'Manga',
        params: {
          id: mangaId,
          page: pagination.currentPage
        }
      })
    }

    const chaptersPaginated = (page, perPageItems, term) => {
      let chapters = mangaChapters.value.sort((a, b) => {
        return a.chapter - b.chapter
      })

      // use fuse.js to search in chapters
      if (term) {
        const fuse = new Fuse(chapters, {
          keys: ['chapter', 'titles.en', 'titles.fr', 'titles.ru', 'titles.es'],
          threshold: 0.4
        })
        chapters = fuse.search(term).map((result) => result.item)
      }

      return helpers.Paginator(chapters, page, perPageItems)
    }
    // #endregion

    const modalActive = ref(false)
    const isLoaded = ref(false)
    const mangaColor = reactive({})
    const mangaUserScore = ref(0)
    const ambient = ref(null)
    const selected = reactive({ open: false, data: null })
    const selectedChapter = ref(null)

    const averageReleaseIntervalTip = (manga) => {
      if (manga) { return `Computed average release interval ±${manga.averageReleaseInterval} days` } else { return '' }
    }

    function addHashToLocation (params) {
      history.pushState(
        {},
        null,
        router.resolve(params).href
      )
    }

    function pageChange (page) {
      pagination.currentPage = page
      // replace url params

      // store to history
      addHashToLocation({
        name: 'Manga',
        params: {
          id: mangaId,
          page
        }
      })
    }

    async function userValidationDeleteManga () {
      const payload = {
        title: t('manga.delete_manga'),
        message: t('manga.delete_manga_confirm'),
        yesLabel: t('general.yes'),
        noLabel: t('general.no'),
        variant: 'danger',
        hideNoButton: false
      }
      return dialogStore.openDialog(payload)
    }

    async function removeManga () {
      const go = await userValidationDeleteManga()
      if (go) {
        await storeHelpers.deleteManga(mangaId)
        notificationsStore.showNotification({
          title: t('manga.manga_deleted'),
          message: `${manga.value.canonicalTitle} ${t('manga.manga_has_being_deleted')} `,
          type: 'success'
        })
        router.push({
          name: 'Mangas',
          params: {}
        })
      }
    }

    async function switchMonitor () {
      await mangasStore.updateMangaMonitor(mangaId)
    }

    async function switchBookmark () {
      await mangasStore.updateMangaBookmark(mangaId)
    }

    async function switchReaded () {
      await mangasStore.updateMangaReaded(mangaId)
    }

    function contentRatingClass (rating) {
      if (rating === 'safe') {
        return 'inline-flex items-center rounded-md dark:bg-darkLight-500/50 dart:text-accent-200 dark:ring-0 bg-green-50/50 px-2 py-1 text-xs font-medium tracking-tight text-green-700 ring-1 ring-inset ring-green-600/20'
      } else {
        return 'inline-flex items-center rounded-md dark:bg-darkLight-500/50 dart:text-red-200 dark:ring-0 bg-red-50/50 px-2 py-1 text-xs font-medium tracking-tight text-red-700 ring-1 ring-inset ring-red-600/20'
      }
    }

    function showChapterModal (chapter) {
      modalActive.value = true
      selectedChapter.value = chapter
    }

    async function userValidationDeleteChapterPages () {
      const payload = {
        title: t('manga.chapter_replace'),
        message: t('manga.chapter_replace_confirm'),
        yesLabel: t('general.yes'),
        noLabel: t('general.no'),
        variant: 'danger',
        hideNoButton: false
      }
      return dialogStore.openDialog(payload)
    }

    async function userDownloadChapter (chapter, sourceId) {
      const needUserApproval = (sourceId && selectedChapter.value.state !== 0) || (!sourceId && chapter.state !== 0)
      let go = true
      if (needUserApproval) {
        go = await userValidationDeleteChapterPages()
      }

      if (go) {
        modalActive.value = false
        selectedChapter.value = null
        await mangasStore.prepareChapterForDownload(chapter.id)
        await storeHelpers.downloadChapter(mangaId, chapter.id, sourceId)

        notificationsStore.showNotification({
          title: t('manga.chapter_pending_download'),
          message: manga.value.canonicalTitle + ' - ' + chapter.chapter + t('manga.chapter_pending_message'),
          type: 'success'
        })
      }
    }

    function closeChapterModal () {
      modalActive.value = false
    }

    const classCover = computed(() => {
      // filter: drop-shadow(0 0 0.75rem rgba(r, g, b, 0.8));
      const color = mangaColor.data
      const rgb = []
      if (color) {
        rgb[0] = parseInt((style.trimhex(color)).substring(0, 2), 16)
        rgb[1] = parseInt((style.trimhex(color)).substring(2, 4), 16)
        rgb[2] = parseInt((style.trimhex(color)).substring(4, 6), 16)
      } else {
        return '0 0 0.75rem rgba(0, 0, 0, 0.5)'
      }
      return `0 0 2.75rem rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.38)`
    })

    async function onUpdateManga () {
      const mangaUpdate = {
        userRating: parseFloat(mangaUserScore.value)
      }
      return await libraryAPI.postManga(mangaId, mangaUpdate)
    }

    ambient.value = new Ambient({
      insertCSS: false,
      retainAttributes: false,
      blur: -1
    })

    onMounted(() => {
      mangasStore.fetchManga(mangaId)
      mangasStore.fetchDiskSize(mangaId)
      mangasStore.fetchChapters(mangaId).then(() => {
        updatePagination()
      })

      setTimeout(() => {
        document.title = manga.value.canonicalTitle
        pageTitle.value = manga.value.canonicalTitle
        mangaColor.data = manga.value.color
        mangaUserScore.value = parseFloat(manga.value.userRating)
        ambient.value.mount()
        isLoaded.value = true
      }, 1000)
    })
    // expose
    return {
      t,
      imgPlaceholder,
      useChapterDotStateClass,
      onChapterSearch,
      contentRatingClass,
      continueReading,
      switchReaded,
      switchBookmark,
      switchMonitor,
      manga,
      characters,
      ownedChapters,
      formatDateTime,
      formatDiskSize,
      suggestions,
      storeIsLoading,
      onTabChange,
      storeHelpers,
      formatNumber,
      //
      ambient,
      mangaUserScore,
      onUpdateManga,
      averageReleaseIntervalTip,
      classCover,
      userDownloadChapter,
      closeChapterModal,
      selectedChapter,
      modalActive,
      lastChapters,
      removeManga,
      heroIcons,
      selected,
      chaptersPaginated,
      mangaId,
      pageChange,
      isLoaded,
      pagination,
      chaptersCount,
      showChapterModal
    }
  }
}
</script>
