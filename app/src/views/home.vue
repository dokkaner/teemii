<template>
  <TransitionRoot as="template" :show="selected.open">
    <Dialog as="div" class="fixed inset-0 z-40 overflow-hidden backdrop-blur-sm" @close="selected.open = false">
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
        <div class="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
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

  <div v-if="mangaCount<1 && isLoaded" class="container mx-auto w-full px-8">
    <div class="flex h-screen flex-col items-center justify-center">
      <div class="text-center">
        <img src="/assets/images/empty.png" alt="Empty Shelf" class="mx-auto mb-6 h-52 w-52">
        <h1 class="mb-4 text-2xl font-semibold text-main-800 dark:text-white">It's a Bit Empty Here!</h1>
        <p class="mb-6 text-main-600 dark:text-darkLight-50"> It seems like your manga collection is empty. Don't worry,
          I'm here to help you.
          <br> Just hit that 'Search Manga' button to get started. 📚✨.</p>
        <router-link to="/search"
                     class="inline-block rounded-md bg-accent-500 px-6 py-3 text-lg text-white dark:bg-darkAccent-500">
          Search a manga
        </router-link>
      </div>
    </div>
  </div>

  <div v-if="mangaCount>0" class="container mx-auto w-full px-8">
    <section class="pb-8">
      <div class="stats mt-5 w-full text-light-900 shadow dark:bg-darkMain-600 dark:text-light-50">
        <div class="stat">
          <div class="stat-figure">
            <component :is="heroIcons['BookOpenIcon']" class="h-8 w-8"/>
          </div>
          <div class="stat-title text-main-500 dark:text-light-600">{{ t('home.total_mangas') }}</div>
          <div class="stat-value text-main-500 dark:text-light-50">{{ mangaCount }}</div>
        </div>

        <div class="stat">
          <div class="stat-figure">
            <component :is="heroIcons['Bars3BottomLeftIcon']" class="h-8 w-8"/>
          </div>
          <div class="stat-title text-main-500 dark:text-light-600">{{ t('home.total_chapters') }}</div>
          <div class="stat-value text-main-500 dark:text-light-50">{{ chapterCount }}</div>
        </div>

        <div class="stat">
          <div class="stat-figure">
            <component :is="heroIcons['DocumentIcon']" class="h-8 w-8"/>
          </div>
          <div class="stat-title text-main-500 dark:text-light-600">{{ t('home.page_read') }}</div>
          <div class="stat-value text-main-500 dark:text-light-50">{{ stats.totalPagesRead }}</div>
        </div>
      </div>
    </section>

    <div v-show="randMangas?.length > 0" class="mx-auto my-4">
      <TBaseSlider :slides="randMangas"/>
    </div>

    <section v-if="lastPubChapters.length>0" class="pb-8">
      <div class="rounded-xl bg-white p-8 shadow dark:bg-darkMain-600">
        <h3 class="self-start text-lg font-semibold leading-6 text-main-900 dark:text-light-600">
          {{ t('home.last_chapters') }}</h3>
        <section class="">
          <TBaseCarousel uID="mbc" :slides="lastPubChapters"/>
        </section>
      </div>
    </section>

    <section>
      <div v-if="mangaCount > 0" class="rounded-xl bg-main-600 p-8 shadow dark:bg-darkMain-600">
        <TBaseTabGroup vAlign="center">
          <TBaseTab :title="t('home.recently_added')">
            <section>
              <TBaseCarousel uID="mbr" :slides="lastAddedMangas" :contentLoading="storeIsLoading" :selectable="false"/>
            </section>
          </TBaseTab>
          <TBaseTab :title="t('home.recently_read')">
            <section>
              <TBaseCarousel uID="mbr" :slides="lastMangasRead" :contentLoading="storeIsLoading"/>
            </section>
          </TBaseTab>
        </TBaseTabGroup>
      </div>

      <template v-if="mangaCount > 0">
        <div class="mt-8 rounded-xl bg-light-400 p-8 shadow dark:bg-darkMain-600">
          <h3 class="mb-4 text-lg font-bold text-main-900 dark:text-light-600">{{ t('home.what_readings') }}</h3>
          <div class="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">

            <template v-if="genresStats?.labels?.length > 0">
              <div class="flex flex-col items-center rounded-xl bg-white p-8 dark:bg-darkLight-500">
                <h3 class="self-start text-lg font-semibold leading-6 text-main-900 dark:text-main-200">
                  {{ t('general.genres') }}</h3>
                <CChart v-if="isLoaded"
                        class="h-[200px] w-[200px] text-main-500 dark:text-main-400 sm:h-[300px] sm:w-[300px]"
                        type="doughnut"
                        :height="300"
                        :width="300"
                        :redraw="true"
                        :data="genresStats"
                        :options="opts"/>
              </div>
            </template>

            <div class="flex flex-col items-center rounded-xl bg-white p-8 dark:bg-darkLight-500">
              <h3 class="self-start text-lg font-semibold leading-6 text-main-900 dark:text-main-200">
                {{ t('home.user_top_mangas') }}</h3>
              <ul role="list" class="w-full">
                <li v-for="manga in topReadMangas.slice(0,4)" :key="manga.slug" class="flex py-4">
                  <router-link :to="storeHelpers.getMangaRouterTo(manga)" class="shrink-0">
                    <img class="h-auto w-16 rounded-sm object-cover"
                         :src="storeHelpers.getMangaCover(manga.id, 240, 360, 'cover')" alt=""/>
                  </router-link>
                  <div class="ml-3 flex flex-col justify-center">
                    <router-link :to="storeHelpers.getMangaRouterTo(manga)">
                      <p class="line-clamp-1 text-left text-xs font-medium uppercase tracking-widest text-main-600 dark:text-light-500">
                        {{ manga.canonicalTitle }}
                      </p>
                    </router-link>
                    <p v-for="(author, index) in manga.authors.slice(0,2)" :key="index"
                       class="line-clamp-1 text-left text-xs tracking-tight text-main-500 dark:text-main-400">
                      {{ author }}
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <template v-if="stats?.authors?.length > 0">
              <div class="flex flex-col items-center rounded-xl bg-white p-8 dark:bg-darkLight-500">
                <h3 class="self-start text-lg font-semibold leading-6 text-main-900 dark:text-main-200">
                  {{ t('home.user_top_authors') }}
                </h3>
                <ul role="list" class="w-full">
                  <li v-for="(author, index) in stats?.authors.slice(0, 4)" :key="index" class="flex py-4">
                    <TBaseAvatar :name="author.name" image="/assets/images/avatar.png" href="#"/>
                  </li>
                </ul>
              </div>
            </template>

          </div>
        </div>
      </template>

    </section>

    <div v-if="personalRecommendations?.length > 0" class="mt-8 rounded-xl p-8">
      <h3 class="mb-4 self-start text-lg font-bold text-main-900">{{ t('home.user_recommendations') }}</h3>
      <section class="pb-4">
        <TBaseCarousel uID="mbps" :slides="personalRecommendations" :contentLoading="suggestions.loading"/>
      </section>
    </div>

    <div v-if="(topMangasRecommendations?.length>0)" class="mt-8 rounded-xl p-8">
      <h3 class="mb-4 self-start text-lg font-bold text-main-900">{{ t('home.top_mangas') }}</h3>
      <section class="px-8 pb-4">
        <TBaseCarousel uID="mbs" :slides="topMangasRecommendations" :contentLoading="topMangas.loading"/>
      </section>
    </div>

  </div>
</template>

<script>
import { pageTitle } from '@/global.js'
import storeHelpers from '@/stores/utils'
import { onMounted, computed, ref, reactive } from 'vue'
import * as heroIcons from '@heroicons/vue/24/outline'
import { CChart } from '@coreui/vue-chartjs'
import {
  TransitionChild,
  TransitionRoot,
  Dialog,
  DialogOverlay,
  DialogTitle
} from '@headlessui/vue'
import AddManga from '../components/addone.vue'
import { useMangaStore } from '@/stores/mangasStore'
import { useChapterStore } from '@/stores/chaptersStore'
import { useStatStore } from '@/stores/statsStore'
import libraryAPI from '@/api/library'
import TBaseSlider from '@/components/base/TBaseSlider.vue'
import { useUserInterfaceStore } from '@/stores/userInterfaceStore.js'
import { useTranslation } from 'i18next-vue'

export default {
  name: 'Home',
  components: {
    TBaseSlider,
    AddManga,
    CChart,
    heroIcons,
    TransitionChild,
    TransitionRoot,
    Dialog,
    DialogOverlay,
    DialogTitle
  },
  props: [],
  setup () {
    const isLoaded = ref(false)
    const { t } = useTranslation()

    // #region new pinia implementation
    const UserInterfaceStore = useUserInterfaceStore()

    const statsStore = useStatStore()
    const stats = computed(() => statsStore.getStats)
    const genresStats = computed(() => statsStore.getStatsByGenre)

    const chaptersStore = useChapterStore()
    const chapters = computed(() => chaptersStore.getChapters)
    const chapterCount = computed(() => chaptersStore.getChaptersCount)
    const mangasStore = useMangaStore()
    const randomManga = computed(() => mangasStore.getRandomMangas)
    const storeIsLoading = computed(() => mangasStore.getIsLoading)
    const lastAddedMangas = computed(() => mangasStore.getLastAddedMangas('secondary'))
    const lastMangasRead = computed(() => mangasStore.getMangasRead('secondary'))
    const topReadMangas = computed(() => mangasStore.getMangasTopRead)
    const mangaCount = computed(() => mangasStore.getMangaCount)

    const suggestions = ref({ data: [], loading: true })
    const topMangas = ref({ data: [], loading: true })

    // #endregion

    const selected = reactive({ open: false, data: null })
    // computed
    const aiSuggests = reactive({})

    const randMangas = computed(() => {
      return randomManga.value.map((m) => {
        return {
          title: m.canonicalTitle,
          image: storeHelpers.getMangaCover(m.id, 1440, 403, 'banner'),
          content: m.title,
          description: storeHelpers.getMangaDescription(m),
          route: storeHelpers.getMangaRouterTo(m)
        }
      })
    })

    const personalRecommendations = computed(() => {
      return suggestions.value.data.map((m) => {
        return {
          id: m.id,
          to: storeHelpers.getMangaSearchRouterTo(m),
          title: m.title,
          image: m.cover,
          tags: m.genre,
          score: m.score,
          state: 2,
          variant: 'primary'
        }
      })
    })

    const topMangasRecommendations = computed(() => {
      return topMangas.value.data.map((m) => {
        return {
          id: m.id,
          to: storeHelpers.getMangaSearchRouterTo(m),
          title: m.title,
          image: m.cover,
          progress: m.readProgress,
          tags: m.genre,
          state: 2,
          variant: 'primary'
        }
      })
    }
    )

    const lastPubChapters = computed(() => {
      return chapters.value
        .slice(0, 10)
        .filter(c => c.manga)
        .map(c => {
          const manga = c.manga || {}
          return {
            id: c.id,
            to: storeHelpers.getMangaRouterTo(manga),
            title: `Chap. ${c.chapter} ${c.titles?.en ?? ''}`,
            image: storeHelpers.getMangaCover(manga.id, 240, 360, 'cover', manga.state),
            progress: manga.readProgress,
            tags: [manga.canonicalTitle],
            state: manga.state,
            variant: 'primary'
          }
        })
    })

    const showAddmanga = (manga) => {
      selected.data = manga
      selected.open = true
    }

    const opts = {
      animation: false,
      responsive: true,
      cutout: '85%',
      radius: '70%',
      plugins: {
        tooltip: {
          callbacks: {
            labelColor: function (context) {
              return {
                borderColor: UserInterfaceStore.isDark ? '#fff' : '#584e64',
                backgroundColor: UserInterfaceStore.isDark ? '#fff' : '#584e64',
                borderWidth: 1
              }
            }
          }
        },
        legend: {
          display: true,
          position: 'bottom',
          align: 'start',
          textAlign: 'center',
          labels: {
            color: UserInterfaceStore.isDark ? '#fff' : '#584e64'
          }
        }
      },
      elements: {
        arc: {
          spacing: 10,
          borderRadius: 8
        }
      }
    }

    async function fetchPersonalSuggestions () {
      const response = await libraryAPI.getPersonalSuggestions()
      if (response.success) {
        suggestions.value.data = Object.freeze(response.body)
        suggestions.value.loading = false
      }
    }

    async function fetchTopMangas () {
      const response = await libraryAPI.getRecommendations(2, 20)
      if (response.success) {
        topMangas.value.data = Object.freeze(response.body)
        topMangas.value.loading = false
      }
    }

    onMounted(() => {
      document.title = 'Home - Teemii'
      pageTitle.value = 'Home'
      mangasStore.fetchMangas().then(() => {
        isLoaded.value = true
      })
      statsStore.fetchStats()
      chaptersStore.fetchChapters()
      fetchPersonalSuggestions()
      fetchTopMangas()
    })

    // expose
    return {
      t,
      // pinia
      storeHelpers,
      randMangas,
      genresStats,
      topMangas,
      suggestions,
      storeIsLoading,
      lastAddedMangas,
      lastMangasRead,
      topMangasRecommendations,
      topReadMangas,
      mangaCount,
      lastPubChapters,
      stats,
      // end pinia
      personalRecommendations,
      showAddmanga,
      selected,
      aiSuggests,
      opts,
      heroIcons,
      chapterCount,
      isLoaded
    }
  }
}
</script>
