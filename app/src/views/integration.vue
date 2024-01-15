<template>
  <div class="container mx-auto w-full">
    <div class="py-6 pl-2">
      <div class="text-2xl font-medium tracking-tight text-main-500 dark:text-light-400 sm:text-4xl">
        {{ t('integration.title') }}
      </div>
      <div class="mt-0.5 flex items-center pt-4 font-medium text-main-400 dark:text-light-500">
        {{ t('integration.subtitle') }}
      </div>
    </div>
    <div class="py-5">
      <div class="flex flex-wrap items-center justify-between sm:flex-nowrap">
        <div class="ml-2 mt-4">
          <h3 class="text-lg font-medium uppercase tracking-wide dark:text-light-600 sm:text-xl">
            {{ t('integration.scrobblers') }}
          </h3>
          <p class="mt-1 text-sm text-main-500 dark:text-light-400">
            {{ t('integration.scrobblers_subtitle') }}
          </p>
        </div>
        <div class="ml-4 mt-4 shrink-0">
        </div>
      </div>
    </div>

    <dl class="mx-auto grid max-w-7xl grid-cols-2 lg:grid-cols-4 lg:px-2 xl:px-0">
      <div
          class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-t border-gray-900/5 px-4 py-2 dark:border-darkMain-500/10 sm:px-6 lg:border-t-0 xl:px-8">
        <dt class="text-sm font-medium leading-6 text-gray-500 dark:text-light-600">{{ t('integration.push') }}</dt>
        <dd class="text-xs font-medium text-gray-700 dark:text-light-300"></dd>
        <dd class="w-full flex-none text-3xl font-medium leading-10 tracking-tight text-gray-900 dark:text-light-300">
          {{ statistics.PushTotal }}
        </dd>
      </div>
      <div
          class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-t border-gray-900/5 px-4 py-2 dark:border-darkMain-500/10 sm:border-l sm:px-6 lg:border-t-0 xl:px-8">
        <dt class="text-sm font-medium leading-6 text-gray-500 dark:text-light-600">
          {{ t('integration.push_errors') }}
        </dt>
        <dd class="text-xs font-medium text-red-600 dark:text-red-500"></dd>
        <dd class="w-full flex-none text-3xl font-medium leading-10 tracking-tight text-gray-900 dark:text-light-300">
          {{ statistics.PushErrors }}
        </dd>
      </div>
      <div
          class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-t border-gray-900/5 px-4 py-2 dark:border-darkMain-500/10 sm:px-6 lg:border-l lg:border-t-0 xl:px-8">
        <dt class="text-sm font-medium leading-6 text-gray-500 dark:text-light-600">{{ t('integration.pull') }}</dt>
        <dd class="text-xs font-medium text-gray-700 dark:text-light-300"></dd>
        <dd class="w-full flex-none text-3xl font-medium leading-10 tracking-tight text-gray-900 dark:text-light-300">
          {{ statistics.PullTotal }}
        </dd>
      </div>
      <div
          class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-t border-gray-900/5 px-4 py-2 dark:border-darkMain-500/10 sm:border-l sm:px-6 lg:border-t-0 xl:px-8">
        <dt class="text-sm font-medium leading-6 text-gray-500 dark:text-light-600">
          {{ t('integration.pull_errors') }}
        </dt>
        <dd class="text-xs font-medium text-red-600 dark:text-red-500"></dd>
        <dd class="w-full flex-none text-3xl font-medium leading-10 tracking-tight text-gray-900 dark:text-light-300">
          {{ statistics.PullErrors }}
        </dd>
      </div>
    </dl>

    <div class="py-4">
      <ul role="list"
          class="ml-3 mr-4 divide-y divide-main-100 overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-main-900/5 dark:divide-darkMain-500
                dark:bg-darkMain-500 dark:ring-dark-600 sm:rounded-xl">
        <li v-for="(service, index) in services" :key="service.name"
            class="relative flex justify-between gap-x-6 px-4 py-5 hover:bg-light-300 dark:hover:bg-darkMain-400 sm:px-6">
          <div class="flex items-center gap-x-3 ">

            <TBaseSwitch size="sm" v-model="service.enabled" @update:modelValue="saveScrobblerSettings(index)"/>

            <div
                :class="[service.enabled ? 'grayscale-0' : 'grayscale', 'flex w-12 min-w-0 gap-x-4 transition duration-300 ease-out sm:w-full']">
              <img class="h-12 w-12 flex-none rounded-full bg-main-50" :src="service.imageUrl" alt=""/>
              <div class="invisible min-w-0 flex-auto sm:visible">
                <p class="text-sm font-semibold leading-6 text-main-900 dark:text-light-500">
                  <a :href="service.href">
                    {{ service.name }}
                  </a>
                </p>
                <p class="invisible mt-1 flex gap-x-2 whitespace-nowrap text-xs leading-5 text-main-500 sm:visible">
                  <span v-if="service.Sync2Way"
                        class="inline-flex items-center rounded-md bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                        2-Way
                  </span>
                  <span v-if="service.ImportNew"
                        class="inline-flex items-center rounded-md bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                        Import New Mangas
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-x-4">
            <div v-if="service.status === 0"
                 class="inline-flex flex-none items-center rounded-full bg-gray-400/10 px-2 py-1 text-xs font-medium text-gray-400 ring-1 ring-inset ring-gray-400/30">
              <component :is="iconoir['LinkXmark']" class="mr-1 h-4 w-4 text-main-300 dark:text-light-400"/>
              {{ t('general.disabled') }}
            </div>
            <div v-else-if="service.status === 1"
                 class="inline-flex flex-none items-center rounded-full bg-green-400/10 px-2 py-1 text-xs font-medium text-green-500 ring-1 ring-inset ring-green-400/30">
              <div class="mr-1 h-2 w-2 rounded-full bg-current p-1"></div>
              {{ t('general.connected') }}
            </div>
            <span v-else-if="service.status === 2"
                  class="inline-flex flex-none items-center rounded-full bg-indigo-400/10 px-2 py-1 text-xs font-medium text-indigo-400 ring-1 ring-inset ring-indigo-400/30">
              <svg class="text-green -ml-1 mr-3 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none"
                   viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ t('general.syncing') }}
            </span>
            <div v-else
                 class="inline-flex flex-none items-center rounded-full bg-red-400/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-400/30">
              <component :is="iconoir['WarningTriangle']" class="mr-1 h-4 w-4 text-red-300 "/>
              {{ t('general.need_attention') }}
            </div>
            <component :is="iconoir['OpenInBrowser']" @click="openSettings(index)"
                       class="h-5 w-5 flex-none cursor-pointer text-main-500 hover:text-accent-500 dark:text-light-600 dark:hover:text-darkAccent-500"
                       aria-hidden="true"/>
          </div>

        </li>
      </ul>

    </div>
  </div>
  <template>
    <TBaseModal :show="modalSettingsActive" size="lg">
      <template #header>
        <div class="flex items-center p-2">
          <img class="h-12 w-12 rounded-full" :src="services[currentService].imageUrl" alt=""/>
          <div class="px-4">
            <h3 class="text-base font-semibold leading-7 text-gray-900 dark:text-light-300">
              {{ t('integration.scrobblers_settings') }}
            </h3>
            <p class="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-light-500">
              {{ t('integration.scrobblers_settings_subtitle') }}
            </p>
          </div>
        </div>
        <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <component :is="iconoir['Xmark']" @click="modalSettingsActive = false"
                     class="h-6 w-6 cursor-pointer text-main-500 hover:text-accent-500 dark:text-darkAccent-500 dark:hover:text-darkAccent-400"/>
        </div>
      </template>
      <div class="grow  border-t border-gray-200 px-4 dark:border-dark-800 sm:px-6">
        <div class="flex h-full grow flex-col overflow-y-auto px-2 text-sm">
          <form @submit.prevent="saveScrobblerSettings(currentService)" class="grow">
            <div class="mb-6 mt-4">
              <div v-if="services[currentService].loginRedirectURL"
                   class="mb-2 mt-1 items-center justify-between gap-x-6 whitespace-pre-wrap sm:mt-0 sm:flex sm:flex-auto">
                <div class="grow">
                  <TBaseInputGroup :label="t('integration.token')" :tooltip="t('integration.token_tip')">
                    <TBaseInput
                        v-model="services[currentService].token"
                        type="text"
                        :name="t('integration.token')"
                    />
                  </TBaseInputGroup>
                </div>
                <div class="mt-4 align-middle">
                  <a :href="services[currentService].loginRedirectURL" target="_blank" rel="noopener noreferrer">
                    <div class="flex items-center gap-x-2">
                      <component :is="iconoir['Link']" class="h-5 w-5 text-main-500"/>
                      <span class="text-accent-500">{{ t('integration.scrobblers_authorize') }}</span>
                    </div>
                  </a>
                </div>
              </div>
              <div v-else>
                <div class="mt-4">
                  <TBaseInputGroup :label="t('general.username') ">
                    <TBaseInput
                        v-model="services[currentService].username"
                        type="text"
                        :name="t('general.username')"
                    />
                  </TBaseInputGroup>
                </div>
                <div class="mt-4">
                  <TBaseInputGroup :label="t('general.password') ">
                    <TBaseInput
                        v-model="services[currentService].password"
                        type="password"
                        :name="t('general.password')"
                    />
                  </TBaseInputGroup>
                </div>
              </div>
              <div class="mt-4">
                <TBaseInputGroup :label="t('integration.excluded_genres')"
                                 :tooltip="t('integration.exclude_genres_tip')">
                  <BaseMultiselect
                      searchable
                      :required="false"
                      v-model="services[currentService].excludedGenres"
                      :label="t('integration.excluded_genres')"
                      mode="tags"
                      :options="itemGenres"
                  />
                </TBaseInputGroup>
              </div>
              <div class="mt-4">
                <TBaseSwitch v-model="services[currentService].Sync2Way"
                             :labelLeft="t('integration.sync_both_ways')"
                             class="flex"/>
              </div>
              <div class="mt-4">
                <TBaseSwitch v-model="services[currentService].enabled"
                             :labelLeft="t('general.enabled')"
                             class="flex"/>
              </div>
            </div>
            <div class="flex justify-end pt-2">
              <div class="shrink-0">
                <TBaseButton type="submit" class="my-4 rounded-md bg-accent-600 px-8 py-2 text-sm font-medium text-white
                shadow-sm hover:bg-accent-500 focus-visible:outline focus-visible:outline-2
                focus-visible:outline-offset-2 focus-visible:outline-accent-600 sm:col-start-2">
                  {{ t('general.save') }}
                </TBaseButton>
              </div>
            </div>
          </form>
        </div>
      </div>
    </TBaseModal>
  </template>

</template>

<script setup>
import { useTranslation } from 'i18next-vue'
import { onMounted, ref } from 'vue'
import TBaseSwitch from '@/components/base/TBaseSwitch.vue'
import * as iconoir from '@iconoir/vue'
import libraryAPI from '@/api/library.js'
import TBaseInput from '@/components/base/TBaseInput.vue'
import TBaseInputGroup from '@/components/base/TBaseInputGroup.vue'
import BaseMultiselect from '@/components/base-select/BaseMultiselect.vue'
import TBaseModal from '@/components/base/TBaseModal.vue'
import { itemGenres, pageTitle } from '@/global'
import { useNotificationStore } from '@/stores/notificationsStore.js'
import TBaseButton from '@/components/base/TBaseButton.vue'

const { t } = useTranslation()
// status: 0 = disabled, 1 = connected, 2 = syncing, 3 = needs attention
const services = ref([])
const modalSettingsActive = ref(false)
const currentService = ref(0)
const notificationsStore = useNotificationStore()
const statistics = ref({})
const isSaving = ref(false)

async function fetchScrobblers () {
  const response = await libraryAPI.getScrobblers()
  if (response.success) {
    services.value = response.body
  }
}

async function fetchScrobblerStatistics () {
  const response = await libraryAPI.getScrobblersStatistics()
  if (response.success) {
    statistics.value = response.body
  }
}

function openSettings (index) {
  currentService.value = index
  modalSettingsActive.value = true
}

async function saveScrobblerSettings (index) {
  if (isSaving.value) {
    return
  }
  isSaving.value = true
  try {
    console.log('saveScrobblerSettings', index)

    const response = await libraryAPI.postScrobblerSettings(services.value[index].name, services.value[index])
    if (response.success) {
      notificationsStore.showNotification({
        title: t('general.success'),
        message: t('general.settings_saved'),
        type: 'success'
      })

      await fetchScrobblers()
      modalSettingsActive.value = false
    } else {
      notificationsStore.showNotification({
        title: t('general.error'),
        message: t('general.settings_not_saved'),
        type: 'error'
      })
    }
  } finally {
    isSaving.value = false
  }
}

defineOptions({
  name: 'integrationView',
  inheritAttrs: false,
  customOptions: {}
})

onMounted(() => {
  document.title = t('navigation.sync')
  pageTitle.value = t('navigation.sync')
  fetchScrobblers()
  fetchScrobblerStatistics()
  // refresh every minute
  setInterval(() => {
    fetchScrobblers()
    fetchScrobblerStatistics()
  }, 60000)
})
</script>
