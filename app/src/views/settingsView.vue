<template>
  <div></div>
  <div class="container mx-auto overflow-hidden sm:overflow-visible">
    <div
        class="sticky left-0 top-0 z-20 mx-auto mb-8 h-full w-full bg-white/80 px-8 pb-8 backdrop-blur-xl transition-all duration-100">
      <div class="w-full pt-4">
        <div>
          <nav class="navbar flex w-full justify-center align-middle" aria-label="tabs">
            <div class="sm:hidden">
              <label for="tabs" class="sr-only">Select a tab</label>
              <!-- Use an "onChange" listener to redirect the user to the selected tab URL. -->
              <select id="tabs" name="tabs" @change="toggleTabs($event.target.selectedIndex)"
                      class="block w-full rounded-md border-main-300 py-2 pl-3 pr-10 text-base focus:border-accent-500 focus:outline-none focus:ring-accent-500 sm:text-sm">
                <option v-for="tab in tabs" :key="tab.name" :selected="tab.current">{{ tab.name }}</option>
              </select>
            </div>
            <div class="hidden sm:block">
              <div class="border-b border-main-200">
                <nav class="-mb-px flex space-x-8" aria-label="Tabs">
                  <a v-for="tab in tabs" :key="tab.name" href="#"
                     :class="[tab.current ? 'border-accent-500 text-accent-600' : 'border-transparent text-main-500 hover:border-main-300 hover:text-main-700', 'whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium']"
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
    </div>

    <main>
      <div v-if="tabs[0].current" class="block w-full">
        <div class="relative mx-auto flex w-full max-w-7xl flex-auto justify-center sm:px-2 lg:px-8 xl:px-12">
          <div class="min-w-0 max-w-2xl flex-auto divide-y divide-main-200 px-4 lg:max-w-none lg:pl-8 lg:pr-0 xl:px-16">
            <div v-for="section in settingsConfig.sections" :key="section.id" class="col-span-1 grid grid-cols-1 gap-x-8
          px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8" :id="section.id">
              <div>
                <h2 class="font-bold leading-7 text-main-600">{{ section.title }}</h2>
                <p class="mt-1 text-xs leading-6 tracking-tight text-main-500">{{ section.desc }}</p>
              </div>
              <form @submit.prevent="savePreferences(section.id)" class="md:col-span-2">
                <div class="grid grid-cols-1 gap-x-6 gap-y-4 sm:max-w-xl sm:grid-cols-6">
                  <div v-for="item in section.items" :key="item.preference" class="col-span-full">
                    <div v-if="item.component === 'TBaseInput'">
                      <TBaseInputGroup :label="item.label" :tooltip="item.help">
                        <TBaseInput
                            v-model="bindings[`${section.preferencesRoot}.${item.preference}`]"
                            :type="item.type"
                            :name="item.name"
                        />
                      </TBaseInputGroup>
                    </div>
                    <div v-else-if="item.component === 'TBaseSwitch'">
                      <TBaseSwitch v-model="bindings[`${section.preferencesRoot}.${item.preference}`]"
                                   :labelLeft="item.label" class="flex"/>
                    </div>
                    <div v-else-if="item.component === 'BaseMultiselect'">
                      <TBaseInputGroup :label="item.label" :tooltip="item.help">
                        <BaseMultiselect
                            searchable
                            :required="item.required || false"
                            v-model="bindings[`${section.preferencesRoot}.${item.preference}`]"
                            :label="`${item.trackBy}`"
                            :track-by="`${item.trackBy}`"
                            :value-prop="`${item.valueProp}`"
                            :placeholder="`${item.label}`"
                            :mode="item.mode"
                            :options="getOptions(item.options)"
                        />
                      </TBaseInputGroup>
                    </div>
                  </div>
                </div>
                <button type="submit" class="mt-4 rounded-md bg-accent-600 px-8 py-2 text-sm font-medium text-white
                shadow-sm hover:bg-accent-500 focus-visible:outline focus-visible:outline-2
                focus-visible:outline-offset-2 focus-visible:outline-accent-600 sm:col-start-2">
                  Save
                </button>
              </form>
            </div>
          </div>
          <div
              class="hidden xl:sticky xl:top-[4.75rem] xl:-mr-6 xl:block xl:h-[calc(100vh-4.75rem)] xl:flex-none xl:overflow-y-auto xl:py-16 xl:pr-6">
            <nav aria-labelledby="settings-nav" class="w-56">
              <ul role="list">
                <li class="relative mt-3 pl-2">
                  <div class="absolute inset-y-0 left-2 w-px bg-main-900/10"></div>
                  <ul role="list" class="relative border-l border-transparent">
                    <li v-for="section in settingsConfig.sections" :key="section.id">
                      <a class="flex justify-between gap-2 py-1 pl-7 pr-3 text-sm text-main-600 transition
                            hover:text-main-900" :href="`#${section.id}`">
                        <span class="truncate">{{ section.title }}</span>
                      </a>
                    </li>
                  </ul>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
      <div v-if="tabs[1].current" class="block w-full divide-y divide-main-500/5">
        <div class="grid grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
          <div>
            <h2 class="text-base font-medium leading-7 text-main-500">System</h2>
            <p class="mt-1 text-sm leading-6 text-main-400">Provides insights of Teemii.</p>
          </div>

          <div class="col-start-2 col-end-4">
            <div class="w-full">
              <div class="p-4 sm:px-0">
                <span class="text-sm font-medium leading-6 text-light-800">Version {{
                    backendSys.value?.system?.appVersion
                  }}
                </span>
                <span v-if="latestRelease.isUpdateAvailable" class="mt-1 pl-5 text-sm leading-6 text-main-700 sm:mt-2">
                  <a :href="latestRelease?.url" target="_blank">
                  <span
                      class="inline-flex items-center rounded-md bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                     {{ latestRelease?.version }} is available !
                       <component :is="iconoir['OpenNewWindow']"
                                  class="h-3 w-3 flex-none cursor-pointer text-green-500 hover:text-accent-500"
                                  aria-hidden="true"/>
                  </span>
                  </a>
                </span>
              </div>
              <div v-if="latestRelease.isUpdateAvailable && latestRelease.body"
                   class="max-h-[20rem] overflow-y-auto scrollbar-thin scrollbar-track-light-300 scrollbar-thumb-main-500">
                <article class="pb-8 pr-8 text-base text-main-500">
                  <p class="text-xs" v-html="markdownToHtml(latestRelease.body)"></p>
                </article>
              </div>

              <dl class="grid grid-cols-1 sm:grid-cols-2">
                <div class="p-4 sm:col-span-1 sm:px-0">
                  <dt class="text-sm font-medium leading-6 text-light-800">Node / Platform</dt>
                  <dd class="mt-1 text-sm leading-6 text-main-700 sm:mt-2">{{ backendSys.value?.system?.nodeversion }} -
                    {{ backendSys.value?.system?.platform }}
                  </dd>
                </div>
                <div class="p-4 sm:col-span-1 sm:px-0">
                  <dt class="text-sm font-medium leading-6 text-light-800">Uptime</dt>
                  <dd class="mt-1 text-sm leading-6 text-main-700 sm:mt-2">
                    {{ helpersUtils.convertUptimeToHumanReadable(backendSys.value?.system?.startTime) }}
                  </dd>
                </div>
                <div class="p-4 sm:col-span-1 sm:px-0">
                  <dt class="text-sm font-medium leading-6 text-light-800">Storage Path</dt>
                  <dd class="mt-1 text-sm leading-6 text-main-700 sm:mt-2">{{ storagePath }}</dd>
                </div>
                <div class="p-4 sm:col-span-1 sm:px-0">
                  <dt class="text-sm font-medium leading-6 text-light-800">Database Path</dt>
                  <dd class="mt-1 text-sm leading-6 text-main-700 sm:mt-2">{{ databasePath }}</dd>
                </div>
              </dl>
            </div>
            <div class="w-full">
              <div class="grid grid-cols-1 sm:grid-cols-2">
                <div>
                  <button @click="restartBackend()"
                          class="mt-4 rounded-md bg-main-600 px-8 py-2 text-sm font-medium text-light-400 shadow-sm
                hover:bg-main-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                focus-visible:outline-light-600 sm:col-start-2">
                    restart backend
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>
        <div class="grid grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
          <div>
            <h2 class="text-base font-medium leading-7 text-main-500">Backing up Teemii</h2>
            <p class="mt-1 text-sm leading-6 text-main-400">Manage the backup of your settings using built-in
              backup.</p>
          </div>
          <div>
            <button @click="openBackupModal()"
                    class="mt-4 rounded-md bg-accent-500 px-8 py-2 text-sm font-medium text-light-100 shadow-sm
                hover:bg-accent-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                focus-visible:outline-accent-600 sm:col-start-2">
              manage
            </button>
          </div>
        </div>
        <div class="grid grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
          <div>
            <h2 class="text-base font-medium leading-7 text-main-500">Schedulers</h2>
            <p class="mt-1 text-sm leading-6 text-main-400">Provides insights into the automated tasks that help manage
              your manga library.</p>
          </div>

          <div class="flex md:col-span-2">
            <ol class="mt-4 w-full divide-y divide-main-100 text-sm leading-6 lg:col-span-7 xl:col-span-8">
              <li v-for="schedule in settings.schedulers" :key="schedule.name"
                  class="relative flex space-x-6 py-6 xl:static">
                <p class="text-sm font-medium leading-6 text-main-900">
                  <span class="relative inline-flex h-2 w-2 rounded-full bg-accent-600"></span>
                </p>
                <div class="flex-auto">
                  <h3 class="pr-10 font-semibold text-main-900 xl:pr-0">{{ schedule.name }}</h3>
                  <dl class="mt-2 flex flex-col text-main-500 xl:flex-row">
                    <div class="flex items-start space-x-3">
                      <dt class="mt-0.5">
                        <span class="sr-only">Date</span>
                        <TBaseIcon :solid="true" name="CalendarIcon" aria-hidden="true" class="h-2 w-2 text-light-700"/>
                      </dt>
                      <dd>
                        <p>{{ cronstrue.toString(schedule.cronPattern) }}</p>
                      </dd>
                    </div>
                    <div
                        class="mt-2 flex items-start space-x-3 xl:ml-3.5 xl:mt-0 xl:border-l xl:border-main-400/50 xl:pl-3.5">
                      <dt class="mt-0.5">
                        <span class="sr-only">Location</span>

                      </dt>
                      <dd> Next run: {{ helpersUtils.convertDateToHumanReadable(schedule.nextRun) }}</dd>
                    </div>
                  </dl>
                </div>
                <div v-show="jobMap[schedule.name]"
                     class="absolute right-0 top-6 xl:relative xl:right-auto xl:top-auto xl:self-center">
                <span @click="executeJob(schedule)"
                      class="tooltip tooltip-bottom before:text-xs before:content-[attr(data-tip)]"
                      data-tip="run immediately">
                <label for="drawer"
                       class="btn btn-square btn-ghost drawer-button text-xs hover:bg-accent-100 hover:text-accent-600">
                  <TBaseIcon :solid="true" name="PlayIcon" aria-hidden="true" class="h-2 w-2 "/>
                </label>
                </span>
                </div>
              </li>
            </ol>
          </div>
        </div>

        <template>
          <TBaseModal :show="modalBackupActive" size="lg">
            <template #header>
              <div class="flex w-full justify-between">
                <span @click="launchBackup()">
                  <label for="drawer" class="btn btn-square btn-ghost drawer-button w-32 text-xs">
                    Backup Now
                    <TBaseIcon name="InboxArrowDownIcon" class="ml-4 h-6 w-6 text-accent-600" aria-hidden="true"/>
                  </label>
                </span>
                <component :is="heroIcons['XMarkIcon']" class="h-6 w-6 cursor-pointer text-main-500"
                           @click="modalBackupActive = false"/>
              </div>
            </template>

            <div
                class="mx-6 mb-6 max-h-96 overflow-auto scrollbar-thin scrollbar-track-light-300 scrollbar-thumb-main-500">
              <table class="min-w-full divide-y divide-main-300 bg-white" aria-describedby="backups list">
                <thead class="text-xs">
                <tr class="h-[48px]">
                  <th scope="col" class="">Name</th>
                  <th scope="col" class="hidden sm:table-cell">Size</th>
                  <th scope="col" class="hidden sm:table-cell">Time</th>
                  <th scope="col" class=""></th>
                  <th scope="col" class=""></th>
                </tr>
                </thead>
                <tbody class="text-xs">
                <tr v-for="(data, index) in backupData.data" :key="index" class="group h-[32px]">
                  <td class="group-hover:bg-main-50">{{ data.file }}</td>
                  <td class="hidden group-hover:bg-main-50 sm:table-cell">{{ helpersUtils.formatBytes(data.size) }}</td>
                  <td class="hidden group-hover:bg-main-50 sm:table-cell">
                    {{ helpersUtils.convertDateToLocale(data.timestamp) }}
                  </td>
                  <td class="group-hover:bg-main-50">
                    <component :is="heroIcons['ArrowDownTrayIcon']" class="h-4 w-4 cursor-pointer text-main-500"
                               @click="downloadBackup(data)"/>
                  </td>
                  <td class="group-hover:bg-main-50">
                    <component :is="heroIcons['PlayIcon']" class="h-4 w-4 cursor-pointer text-accent-500"
                               @click="launchRestore(data)"/>
                  </td>
                </tr>
                </tbody>
              </table>
            </div>
          </TBaseModal>
        </template>
      </div>
      <div v-if="tabs[2].current" class="w-full">
        <div class="pb-2 sm:flex sm:items-center sm:justify-between">
          <h3 class="text-base font-medium leading-6 text-main-900"></h3>
          <div class="mt-3 flex sm:ml-4 sm:mt-0">
            <button @click="fetchLogs()" class="btn btn-square btn-ghost drawer-button w-32 text-xs">
              Refresh
              <TBaseIcon name="ArrowPathIcon" class="ml-4 h-6 w-6 text-accent-600" aria-hidden="true"/>
            </button>
            <button @click="downloadLogs()" class="btn btn-square btn-ghost drawer-button ml-2 w-32 text-xs">
              Download
              <TBaseIcon name="DocumentArrowDownIcon" class="ml-4 h-6 w-6 text-accent-600" aria-hidden="true"/>
            </button>
          </div>
        </div>

        <BaseTable :data="logs.data" :columns="columns">
          <template #cell-time="{ row }">
            {{ helpersUtils.convertDateToLocale(row.data.time) }}
          </template>
          <template #cell-level="{ row }">
            <span :class="getClassForLevel(row.data.level)">
             {{ row.data.level }}
            </span>
          </template>
          <template #cell-msg="{ row }">
            <span :class="getClassFontForLevel(row.data.level)">
             {{ row.data.msg }}
            </span>
          </template>
        </BaseTable>
      </div>
    </main>
  </div>
</template>
<script setup>

// eslint-disable-next-line no-undef
import * as iconoir from '@iconoir/vue'
import { computed, onMounted, reactive, ref } from 'vue'
import libraryAPI from '@/api/library'
import { useNotificationStore } from '@/stores/notificationsStore'
import cronstrue from 'cronstrue'
import helpersUtils from '@/utils/helpers.js'
import settingsConfig from '@/views/settings/settingsConfig.json'
import TBaseInput from '@/components/base/TBaseInput.vue'
import TBaseSwitch from '@/components/base/TBaseSwitch.vue'
import TBaseInputGroup from '@/components/base/TBaseInputGroup.vue'
import BaseMultiselect from '@/components/base-select/BaseMultiselect.vue'
import { langs, itemGenres, backendSys, pageTitle } from '@/global'
import * as heroIcons from '@heroicons/vue/24/solid/index.js'
import TBaseModal from '@/components/base/TBaseModal.vue'
import { useDialogStore } from '@/stores/dialogsStore.js'
import BaseTable from '@/components/base-table/BaseTable.vue'
import { markdownToHtml } from '@/composables/useUXHelpers.js'

const modalBackupActive = ref(false)
const openTab = ref(0)
const dialogStore = useDialogStore()

const tabs = ref([
  { index: 0, name: 'Preferences', href: '#', current: true },
  { index: 1, name: 'System', href: '#', current: false },
  { index: 2, name: 'Logs', href: '#', current: false }
])

const columns = computed(() => {
  return [
    { key: 'time', label: 'timestamp', tdClass: 'text-xs flex' },
    { key: 'level', label: 'level', thClass: 'extra', tdClass: 'text-xs' },
    { key: 'msg', label: 'message', tdClass: 'text-xs maw-w-8' }
  ]
})

function getClassForLevel (level) {
  switch (level) {
    case 'INFO':
      return 'inline-flex items-center rounded-sm bg-blue-100 px-1.5 text-xs text-blue-700'
    case 'ERROR':
      return 'inline-flex items-center rounded-sm bg-red-100 px-1.5 text-xs text-red-700'
    case 'WARN':
      return 'inline-flex items-center rounded-sm bg-yellow-100 px-1.5 text-xs text-yellow-800'
    default:
      return 'inline-flex items-center rounded-sm bg-main-100 px-1.5 text-xs text-main-60'
  }
}

function getClassFontForLevel (level) {
  switch (level) {
    case 'INFO':
      return 'text-blue-70'
    case 'ERROR':
      return 'text-red-700'
    case 'WARN':
      return 'text-yellow-800'
    default:
      return 'text-main-60'
  }
}

function toggleTabs (tabNumber) {
  tabs.value[openTab.value].current = false
  tabs.value[tabNumber].current = true
  openTab.value = tabNumber
}

const latestRelease = ref({})
const storagePath = ref('')
const databasePath = ref('')
const settings = ref({ schedulers: [], loading: true })
const logs = ref({ data: [], loading: true })
const userPreferences = reactive({ data: {} })
const notificationsStore = useNotificationStore()
const bindings = reactive({})
const backupData = reactive({ data: [] })
const jobMap = {
  maintenanceScheduler: 'maintenanceQueue',
  libraryUpdateScheduler: 'libraryUpdateQueue',
  computeReadingScheduler: 'computeReadingQueue',
  computeSuggesterScheduler: 'computeSuggesterQueue',
  scrobblersScheduler: 'scrobblersQueue'
}

async function userValidationBackupRestore () {
  const payload = {
    title: 'Restore Backup',
    message: 'Are you sure you want to restore this backup? It will overwrite your current database and settings.',
    yesLabel: 'Yes',
    noLabel: 'No',
    variant: 'danger',
    hideNoButton: false
  }
  return dialogStore.openDialog(payload)
}

async function userValidationRestartBackend () {
  const payload = {
    title: 'Restart Backend',
    message: 'Are you sure you want to restart the backend? It will stop all running tasks.',
    yesLabel: 'Yes',
    noLabel: 'No',
    variant: 'danger',
    hideNoButton: false
  }
  return dialogStore.openDialog(payload)
}

async function openBackupModal () {
  const response = await libraryAPI.fetchBackups()

  if (response.success) {
    backupData.data = response.body
    modalBackupActive.value = true
  } else {
    notificationsStore.showNotification({
      title: 'Backup',
      message: 'There was an error fetching the backups.',
      type: 'error'
    })
  }
}

async function downloadBackup (backupItem) {
  const response = await libraryAPI.downloadBackup(backupItem)

  if (response.status === 200) {
    const blob = new Blob([response.data], { type: 'application/octet-stream' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = backupItem.file
    link.click()
    URL.revokeObjectURL(link.href)
  } else {
    notificationsStore.showNotification({
      title: 'Backup',
      message: 'There was an error downloading the backup.',
      type: 'error'
    })
  }
}

async function launchRestore (backupItem) {
  const go = await userValidationBackupRestore()

  if (!go) {
    return
  }

  const response = await libraryAPI.doRestore(backupItem)

  if (response.success) {
    notificationsStore.showNotification({
      title: 'Restore',
      message: 'The restore has been launched.',
      type: 'success'
    })
  } else {
    notificationsStore.showNotification({
      title: 'Restore',
      message: 'There was an error launching the restore.',
      type: 'error'
    })
  }
}

async function launchBackup () {
  const response = await libraryAPI.doBackup()

  if (response.success) {
    notificationsStore.showNotification({
      title: 'Backup',
      message: 'The backup has been launched.',
      type: 'success'
    })

    // refresh backups after 2 seconds
    setTimeout(() => {
      libraryAPI.fetchBackups().then((response) => {
        if (response.success) {
          backupData.data = response.body
        }
      })
    }, 2000)
  } else {
    notificationsStore.showNotification({
      title: 'Backup',
      message: 'There was an error launching the backup.',
      type: 'error'
    })
  }
}

const getOptions = (optionsName) => {
  const optionsMap = {
    itemGenres: itemGenres.value,
    langs
  }
  return optionsMap[optionsName] || []
}

const createBindings = () => {
  settingsConfig.sections.forEach(section => {
    section.items.forEach(item => {
      const prefPath = `${section.preferencesRoot}.${item.preference}`
      bindings[prefPath] = userPreferences.data[section.preferencesRoot]?.[item.preference] ?? ''
    })
  })
}

/**
 * Display a notification for the save operation of a section.
 * @param {Object} section - The section object for which the notification is displayed.
 * @param {boolean} success - Whether the save operation was successful.
 */
function displaySaveNotification (section, success) {
  notificationsStore.showNotification({
    title: `Settings ${success ? 'Saved' : 'Save Failed'}: ${section.title}`,
    message: success
      ? `Settings for ${section.title} have been saved.`
      : `There was an error saving settings for ${section.title}.`,
    type: success ? 'success' : 'error'
  })
}

/**
 * Save the modified user preferences.
 * Iterates through each preference and saves them via the API.
 * Shows a notification on success or failure.
 */
async function savePreferences (sectionToSave = null) {
  const sectionsToProcess = sectionToSave
    ? settingsConfig.sections.filter(section => section.id === sectionToSave)
    : settingsConfig.sections

  for (const section of sectionsToProcess) {
    let success = true
    const preferencesToSave = []

    // Collecting all preferences in the current section
    for (const item of section.items) {
      const prefPath = `${section.preferencesRoot}.${item.preference}`
      const value = bindings[prefPath]
      if (value === undefined) continue
      preferencesToSave.push({ key: 'preferences.' + prefPath, value, secret: item.secure ?? false })
    }

    // Saving all preferences in the current section
    for (const pref of preferencesToSave) {
      const response = await libraryAPI.postUserPreferenceValue(pref.key, pref.value, pref.secret)
      if (!response.success) {
        success = false
        break // Stop saving this section on first failure
      }
    }

    // Displaying the notification for the current section
    displaySaveNotification(section, success)
    if (!success) break // Stop processing if a section save fails
  }

  // Fetch to update UI with all saved values
  await fetchPreferences()
}

async function fetchPreferences () {
  const response = await libraryAPI.getUserPreferences()

  if (response.success) {
    userPreferences.data = response.body.body?.preferences || {}
    storagePath.value = response.body.body?.storagePath || ''
    databasePath.value = response.body.body?.databasePath || ''
    createBindings()
  }
}

async function fetchSettings () {
  const response = await libraryAPI.getSettings()

  if (response.success) {
    settings.value.schedulers = response.body
  }
}

async function fetchLatestRelease () {
  const response = await libraryAPI.getReleasesLatest()

  if (response.success) {
    latestRelease.value = response.body
  }
}

async function fetchLogs () {
  const response = await libraryAPI.getLogs()

  if (response.success) {
    logs.value.data = response.body
  }
}

async function restartBackend () {
  const go = await userValidationRestartBackend()

  if (!go) {
    return
  }

  const response = await libraryAPI.backendRestart()

  if (response.success) {
    notificationsStore.showNotification({
      title: 'Restarting backend',
      message: 'The backend is restarting now.',
      type: 'success'
    })
  }
}

async function downloadLogs () {
  const response = await libraryAPI.getLogsDownload()

  if (response.success) {
    const blob = new Blob([response.body], { type: 'application/txt' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'logs.txt'
    link.click()
    URL.revokeObjectURL(link.href)
  }
}

const executeJob = async (scheduler) => {
  const forQueue = jobMap[scheduler.name]
  if (!forQueue) {
    notificationsStore.showNotification({
      title: 'Job not found',
      message: 'The job you are trying to execute does not exist.',
      type: 'error'
    })
    return
  }

  const job = {
    for: forQueue,
    options: {
      maxRetries: 1,
      retryInterval: 1000 * 5, // 5 seconds
      timeout: 1000 * 60 * 60 // 60 minutes
    },
    payload: {},
    entityId: null
  }

  const response = await libraryAPI.publishCommand(job, 1)

  if (response.success) {
    notificationsStore.showNotification({
      title: 'On demand job',
      message: 'Your job execution has been scheduled now.',
      type: 'success'
    })
  }
}

// settings dynamics components

defineOptions({
  name: 'settingsView',
  inheritAttrs: false,
  customOptions: {}
})

onMounted(() => {
  document.title = 'Settings'
  pageTitle.value = 'Settings'
  fetchPreferences()
  // refresh every 5 seconds
  fetchSettings()
  fetchLogs()
  fetchLatestRelease()
  setInterval(() => {
    fetchSettings()
  }, 5000)
})
</script>
```
