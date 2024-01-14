<template>
  <div v-if="!storeIsLoading" class="container mx-auto overflow-y-visible">
    <div
        class="sticky left-0 top-0 z-20 mx-auto mb-8 rounded-b-lg bg-white/80 px-8 pb-4 backdrop-blur-xl transition-all duration-100 dark:bg-darkMain-800/80">
      <div class="grid w-full pt-4 sm:grid-cols-3 ">
        <div class="hidden sm:flex">
          <div class="flex items-center">
            <div class="flex-none">
              <p class="text-base dark:text-light-50"> {{ t('navigation.activity') }} </p>
              <p class="text-xs tracking-tight dark:text-light-600"><b> {{ activities?.length }} </b>
                {{ t('activity.jobs') }} </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="px-4 sm:px-0">
      <table class="h-full w-full table-auto" aria-describedby="jobs list">
        <thead class="border-main/10 text-main border-b text-sm dark:border-darkMain-500/10 dark:text-light-300">
        <tr>
          <th scope="col" class=""></th>
          <th scope="col" class="hidden md:table-cell">{{ t('activity.job') }}</th>
          <th scope="col" class="hidden lg:table-cell">{{ t('activity.status') }}</th>
          <th scope="col" class="hidden lg:table-cell">{{ t('activity.duration') }}</th>
          <th scope="col" class="hidden lg:table-cell">{{ t('activity.last_updated') }}</th>
          <th scope="col" class=""></th>
        </tr>
        </thead>
        <tbody class="divide-y divide-light-600/20 dark:divide-darkMain-700/20">
        <tr v-for="job in activities" :key="job.id">
          <td class="max-w-sm py-4 pl-0">
            <div class="flex items-center gap-x-4">
              <img v-show="job.entityType === 'chapter'" :src="helpers.getMangaCover(job.data?.payload?.parentId)"
                   alt="cover" class="h-11 w-8 rounded-sm bg-main-800"/>
              <img v-show="job.entityType === 'manga'" :src="helpers.getMangaCover(job.manga?.id)" alt="cover"
                   class="h-11 w-8 rounded-sm bg-main-800"/>
              <div>
                <div
                    class="line-clamp-1 text-left text-xs font-medium uppercase tracking-tight text-main-700 dark:text-light-500">
                  {{ getTitle(job) }}
                </div>
                <p class="line-clamp-1 text-left text-xs font-medium  tracking-tight text-main-400">
                  {{ getSubTitle(job) }}</p>
              </div>
            </div>
          </td>
          <td class="hidden py-4 pl-0 sm:table-cell">
            <div class="flex justify-center">
              <div
                  class="line-clamp-1 rounded-md bg-main-50 px-2 py-1 text-xs tracking-tight text-main-400 ring-1 ring-inset ring-main-500/10">
                {{ getJobType(job) }}
              </div>
            </div>
          </td>
          <td class="hidden p-4 sm:table-cell">
            <div class="mx-auto flex items-center gap-x-2">
              <time class="text-main-400 sm:hidden" :datetime="job.updatedAt">{{ job.updatedAt }}</time>
              <div v-show="(job.status !== 'processing')"
                   :class="[statuses[job.status], 'flex-none rounded-full p-1']">
                <div class="h-1.5 w-1.5 rounded-full bg-current"/>
              </div>
              <svg v-show="(job.status === 'processing')" class="h-5 w-5 animate-spin text-blue-400"
                   xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div>
                <div class="line-clamp-1 hidden self-start text-xs tracking-tight text-main-400 sm:block">
                  {{ job.status }}
                </div>
              </div>

              <div v-show="(job.retryCount > 0)" class=" hidden text-xs leading-5 text-blue-700 lg:block">
                  <span class="inset-0 object-right-top">
                  <div
                      class="inline-flex items-center rounded-full border border-white bg-red-500 px-1.5 py-0.5 text-xs leading-4 text-white">
                  {{ job.retryCount }} retry
                   </div>
                  </span>
              </div>
              <div v-show="(job.status === 'processing')" class="hidden text-xs leading-5  text-blue-700 lg:block">
                {{ job.progress?.value }}%
              </div>
            </div>
            <div v-show="(job.status === 'failed')" class="mt-1 hidden text-xs leading-5 text-red-700 lg:block">
              {{ job.error?.message }}
            </div>
            <div v-show="(job.status === 'processing')" class="mt-1 hidden text-xs leading-5 text-main-700 lg:block">
              {{ job.progress?.msg }}
            </div>
          </td>
          <td class="hidden py-4 pl-0 text-xs tracking-tight text-main-400 sm:table-cell ">
            {{ getDuration(job) }}
          </td>
          <td class="hidden py-4 pl-0 text-xs tracking-tight text-main-400 sm:table-cell ">
            <time :datetime="job.updatedAt">{{ formatDate(job.updatedAt) }}</time>
          </td>
          <td class="max-w-sm py-2 pl-2">
            <router-link :to="getRouterLink(job)" class="text-main-400 hover:text-main-600">
              <span class="sr-only">View</span>
              <TBaseIcon name="ChevronRightIcon" class="h-12"/>
            </router-link>
          </td>
        </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
<script setup>
import { useTranslation } from 'i18next-vue'
import { pageTitle } from '@/global.js'
import { useJobStore } from '@/stores/jobsStore'
import helpers from '@/stores/utils'
import { computed, onMounted } from 'vue'

const { t } = useTranslation()
const jobsStore = useJobStore()
const storeIsLoading = computed(() => jobsStore.getIsLoading)
const activities = computed(() => jobsStore.jobs)

const statuses = {
  completed: 'text-green-400 bg-green-400/10',
  failed: 'text-rose-400 bg-rose-400/10',
  backlog: 'text-main-400 bg-main-400/10',
  pending: 'text-yellow-400 bg-yellow-400/10',
  processing: 'text-blue-400 bg-blue-400/10',
  delayed: 'text-red-400 bg-red-400/10'
}

function getTitle (job) {
  if (job.entityType === 'chapter') {
    return getChapterTitle(job.chapter)
  }
  if (job.entityType === 'manga') {
    return job.manga?.canonicalTitle
  }
  return ''
}

function getSubTitle (job) {
  if (job.entityType === 'chapter') {
    return job.manga?.canonicalTitle
  }
  if (job.entityType === 'manga') {
    return job.manga?.startYear + ' - ' + job.manga?.authors?.[0]?.name
  }
  return ''
}

function getJobType (job) {
  if (job.entityType === 'chapter') {
    return 'Download'
  }
  if (job.entityType === 'manga') {
    return 'Import'
  }
  return ''
}

function getChapterTitle (chapter) {
  const title = `chapter ${chapter.chapter}`

  if (chapter.titles?.length < 3) return title
  if (chapter.titles?.en) return title + ' - ' + chapter.titles.en
  const key = chapter.titles ? Object.keys(chapter.titles)[0] : null
  if (key) {
    return title + ' - ' + Object.values(chapter.titles)[key]
  }
  return title
}

function getDuration (job) {
  let duration = new Date() - new Date(job.createdAt)
  if (job.finishedAt) {
    duration = new Date(job.finishedAt) - new Date(job.createdAt)
  } else if (job.status === 'failed') {
    duration = new Date(job.updatedAt) - new Date(job.createdAt)
  }

  // convert to human readable format
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  return `${minutes}m ${seconds}s`
}

function formatDate (dateString) {
  if (dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  } else {
    return ''
  }
}

function getRouterLink (task) {
  if (task.entityType === 'chapter') {
    return `/chapters/${task.chapter?.id}/1`
  } else if (task.entityType === 'manga') {
    return `/mangas/${task.manga?.id}/1`
  } else {
    return ''
  }
}

// eslint-disable-next-line no-undef
defineOptions({
  name: 'ActivityView',
  inheritAttrs: false,
  customOptions: {}
})

onMounted(() => {
  document.title = 'Activity'
  jobsStore.fetchJobs().then(() => {
    pageTitle.value = 'Activity - ' + activities.value.length + ' jobs'
  })
})

</script>
