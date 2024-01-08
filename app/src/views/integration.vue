<template>
  <div class="container mx-auto w-full px-8">
    <div class="py-6">
      <div class="text-2xl font-medium tracking-tight text-main-500 sm:text-4xl">Integrations</div>
      <div class="mt-0.5 flex items-center pt-4 font-medium text-main-400">
        Seamlessly Connect Teemii with Your Favorite Services.
      </div>
    </div>
    <div class="py-5">
      <div class="-ml-4 -mt-4 flex flex-wrap items-center justify-between sm:flex-nowrap">
        <div class="ml-4 mt-4">
          <h3 class="text-base font-semibold leading-6 text-gray-900">Scrobblers</h3>
          <p class="mt-1 text-gray-500">Automatically sync your reading progress and manga library with external
            platforms. Keep your collections aligned and up-to-date across different services.</p>
        </div>
        <div class="ml-4 mt-4 shrink-0">
        </div>
      </div>
    </div>
    <div class="">
      <dl class="mx-auto grid max-w-7xl grid-cols-2 lg:grid-cols-4 lg:px-2 xl:px-0">
        <div
            class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-t border-gray-900/5 px-4 py-2 sm:px-6 lg:border-t-0 xl:px-8 ">
          <dt class="text-sm font-medium leading-6 text-gray-500">Push</dt>
          <dd class="text-xs font-medium text-gray-700"></dd>
          <dd class="w-full flex-none text-3xl font-medium leading-10 tracking-tight text-gray-900">
            {{ statistics.PushTotal }}
          </dd>
        </div>
        <div
            class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-t border-gray-900/5 px-4 py-2 sm:border-l sm:px-6 lg:border-t-0 xl:px-8">
          <dt class="text-sm font-medium leading-6 text-gray-500">Push Errors</dt>
          <dd class="text-xs font-medium text-rose-600"></dd>
          <dd class="w-full flex-none text-3xl font-medium leading-10 tracking-tight text-gray-900">
            {{ statistics.PushErrors }}
          </dd>
        </div>
        <div
            class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-t border-gray-900/5 px-4 py-2 sm:px-6 lg:border-l lg:border-t-0 xl:px-8">
          <dt class="text-sm font-medium leading-6 text-gray-500">Pull</dt>
          <dd class="text-xs font-medium text-gray-700"></dd>
          <dd class="w-full flex-none text-3xl font-medium leading-10 tracking-tight text-gray-900">
            {{ statistics.PullTotal }}
          </dd>
        </div>
        <div
            class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-t border-gray-900/5 px-4 py-2 sm:border-l sm:px-6 lg:border-t-0 xl:px-8">
          <dt class="text-sm font-medium leading-6 text-gray-500">Pull Errors</dt>
          <dd class="text-xs font-medium text-rose-600"></dd>
          <dd class="w-full flex-none text-3xl font-medium leading-10 tracking-tight text-gray-900">
            {{ statistics.PullErrors }}
          </dd>
        </div>
      </dl>
    </div>
    <div class="pb-5">

      <ul role="list"
          class="divide-y divide-main-100 overflow-hidden bg-white shadow-sm ring-1 ring-main-900/5 sm:rounded-xl">

        <li v-for="(service, index) in services" :key="service.name"
            class="relative flex justify-between gap-x-6 px-4 py-5 hover:bg-light-300 sm:px-6">
          <div class="flex items-center gap-x-3 ">

            <TBaseSwitch size="sm" v-model="service.enabled" @update:modelValue="saveScrobblerSettings(index)"/>

            <div
                :class="[service.enabled ? 'grayscale-0' : 'grayscale', 'flex w-12 min-w-0 gap-x-4 transition duration-300 ease-out sm:w-full']">
              <img class="h-12 w-12 flex-none rounded-full bg-main-50" :src="service.imageUrl" alt=""/>
              <div class="invisible min-w-0 flex-auto sm:visible">
                <p class="text-sm font-semibold leading-6 text-main-900">
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
              <component :is="iconoir['LinkXmark']" class="mr-1 h-4 w-4 text-main-300 "/>
              Disabled
            </div>
            <div v-else-if="service.status === 1"
                 class="inline-flex flex-none items-center rounded-full bg-green-400/10 px-2 py-1 text-xs font-medium text-green-500 ring-1 ring-inset ring-green-400/30">
              <div class="mr-1 h-2 w-2 rounded-full bg-current p-1"></div>
              Connected
            </div>
            <span v-else-if="service.status === 2"
                  class="inline-flex flex-none items-center rounded-full bg-indigo-400/10 px-2 py-1 text-xs font-medium text-indigo-400 ring-1 ring-inset ring-indigo-400/30">
              <svg class="text-green -ml-1 mr-3 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none"
                   viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Syncing
            </span>
            <div v-else
                 class="inline-flex flex-none items-center rounded-full bg-red-400/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-400/30">
              <component :is="iconoir['WarningTriangle']" class="mr-1 h-4 w-4 text-red-300 "/>
              Needs attention
            </div>
            <component :is="iconoir['OpenInBrowser']" @click="openSettings(index)"
                       class="h-5 w-5 flex-none cursor-pointer text-main-500 hover:text-accent-500"
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
          <img class="h-12 w-12 rounded-full bg-main-50" :src="services[currentService].imageUrl" alt=""/>
          <div class="px-4">
            <h3 class="text-base font-semibold leading-7 text-gray-900">Scrobblers Settings</h3>
            <p class="mt-1 max-w-2xl text-sm leading-6 text-gray-500">Modify synchronisation settings here.</p>
          </div>
        </div>
        <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <component :is="iconoir['Xmark']" @click="modalSettingsActive = false"
                     class="h-6 w-6 cursor-pointer text-main-500 hover:text-accent-500"/>
        </div>
      </template>
      <div class="grow border-t border-gray-200 px-4 sm:px-6 ">
        <div class="flex h-full grow flex-col overflow-y-auto px-2 text-sm">
          <form @submit.prevent="saveScrobblerSettings(currentService)" class="grow">
            <div class="mb-6 mt-4">
              <div v-if="services[currentService].loginRedirectURL"
                   class="mb-2 mt-1 items-center justify-between gap-x-6 whitespace-pre-wrap sm:mt-0 sm:flex sm:flex-auto">
                <TBaseInputGroup label="Token" tooltip="click on Authorize then paste the token here.">
                  <TBaseInput
                      v-model="services[currentService].token"
                      type="text"
                      name="token"
                  />
                </TBaseInputGroup>
                <a :href="services[currentService].loginRedirectURL"
                   target="_blank" rel="noopener noreferrer">
                  <button type="button" class="mt-6 py-2 font-semibold text-accent-600 hover:text-accent-500">
                    Authorize
                  </button>
                </a>
              </div>
              <div v-else>
                <div class="mt-4">
                  <TBaseInputGroup label="username">
                    <TBaseInput
                        v-model="services[currentService].username"
                        type="text"
                        name="username"
                    />
                  </TBaseInputGroup>
                </div>
                <div class="mt-4">
                  <TBaseInputGroup label="password">
                    <TBaseInput
                        v-model="services[currentService].password"
                        type="password"
                        name="password"
                    />
                  </TBaseInputGroup>
                </div>
              </div>
              <div class="mt-4">
                <TBaseInputGroup label="Excluded Genres" tooltip="Teemii will not send titles with theses genres.">
                  <BaseMultiselect
                      searchable
                      :required="false"
                      v-model="services[currentService].excludedGenres"
                      label="Exclude Genres"
                      mode="tags"
                      :options="itemGenres"
                  />
                </TBaseInputGroup>
              </div>
              <div class="mt-4">
                <TBaseSwitch v-model="services[currentService].Sync2Way" labelLeft="Synchronize both way" class="flex"/>
              </div>
              <!--div class="mt-4">
                <TBaseSwitch v-model="services[currentService].ImportNew" labelLeft="Import manga not found" class="flex" />
              </div-->
              <div class="mt-4">
                <TBaseSwitch v-model="services[currentService].enabled" labelLeft="Enabled" class="flex"/>
              </div>
            </div>
            <div class="flex justify-end pt-2">
              <div class="shrink-0">
                <button type="submit" class="my-4 rounded-md bg-accent-600 px-8 py-2 text-sm font-medium text-white
                  shadow-sm hover:bg-accent-500 focus-visible:outline focus-visible:outline-2
                  focus-visible:outline-offset-2 focus-visible:outline-accent-600 sm:col-start-2">
                  Save
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </TBaseModal>
  </template>

</template>

<script setup>
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
import { debounce } from 'lodash'

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
        title: 'Success',
        message: 'Settings saved.',
        type: 'success'
      })

      await fetchScrobblers()
      modalSettingsActive.value = false
    } else {
      notificationsStore.showNotification({
        title: 'Error',
        message: 'An error occurred while saving settings.',
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
  document.title = 'Integrations'
  pageTitle.value = 'Integrations'
  fetchScrobblers()
  fetchScrobblerStatistics()
  // refresh every minute
  setInterval(() => {
    fetchScrobblers()
    fetchScrobblerStatistics()
  }, 60000)
})
</script>
