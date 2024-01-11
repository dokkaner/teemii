<template>
  <div
      :class="success || info ? 'backdrop-blur-xl bg-white/90 dark:bg-darkMain-700/90' : 'bg-red-50 dark:bg-darkRed-50'"
      class="pointer-events-auto mb-3 w-full max-w-sm cursor-pointer overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 md:w-96"
      @click.stop="hideNotificationAction"
      @mouseenter="clearNotificationTimeOut"
      @mouseleave="setNotificationTimeOut"
  >
    <div class="flex w-full flex-col items-center space-y-4 sm:items-end">
      <div
          class="pointer-events-auto flex w-full max-w-md divide-x divide-main-200 dark:divide-darkMain-300 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
        <div class="flex w-0 flex-1 items-start p-4">
          <div v-if="notification.media" class="mr-2 shrink-0">
            <img class="h-14 w-10 object-cover rounded-full" :src="notification.media" alt=""/>
          </div>
          <div v-else class="mr-2 shrink-0">
            <component :is="heroIcons[notificationIcon]" v-if="isLoaded && notificationIcon" class="h-6 w-6"
                       :class="notificationColor"/>
          </div>
          <div class="w-full">
            <p class="text-sm font-bold text-main-900 dark:text-light-400">{{
                notification.title || defaultTitle
              }}</p>
            <p class="mt-1 text-sm text-main-500 dark:text-darkLight-100">{{ notification.message }}</p>
          </div>
          <div v-if="!notification.actionLabel" class="ml-4 flex shrink-0">
            <button type="button" @click="hideNotificationAction"
                    class="inline-flex rounded-md text-main-400 dark:text-darkAccent-400 hover:text-accent-500 dark:hover:text-darkAccent-500 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-darkAccent-500 focus:ring-offset-2">
              <span class="sr-only">Close</span>
              <component :is="heroIcons[closeIcon]" v-if="isLoaded && closeIcon" class="h-5 w-5"/>
            </button>
          </div>
          <div class="absolute bottom-0 left-0 block h-1 w-full bg-main-100 dark:bg-darkMain-300">
            <div class="h-1 bg-accent-600 dark:bg-darkAccent-600" :style="{ width: progression + '%' }"></div>
          </div>
        </div>
        <div v-if="notification.actionLabel" class="flex">
          <div class="flex flex-col divide-y divide-main-200 dark:divide-darkMain-300">
            <div class="flex h-0 flex-1">
              <button type="button" @click="handleClick"
                      class="flex w-full items-center justify-center rounded-none rounded-tr-lg border border-transparent px-4 py-3 text-sm text-accent-600 dark:text-darkAccent-600 hover:text-accent-500 dark:hover:text-darkAccent-500 focus:z-10 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-darkAccent-500">
                {{ notification.actionLabel }}
              </button>
            </div>
            <div class="flex h-0 flex-1">
              <button type="button" @click="hideNotificationAction"
                      class="flex w-full items-center justify-center rounded-none rounded-br-lg border border-transparent px-4 py-3 text-sm text-main-700 dark:text-darkLight-50 hover:text-main-500 dark:hover:text-darkLight-300 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-darkAccent-500">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, computed, ref, reactive } from 'vue'
import { useNotificationStore } from '@/stores/notificationsStore'
import * as heroIcons from '@heroicons/vue/24/outline'

const notificationStore = useNotificationStore()

const isLoaded = ref(false)
const closeIcon = 'XMarkIcon'

const props = defineProps({
  notification: {
    type: Object,
    default: null
  },
  actionClick: {
    type: Function,
    default: null,
    required: false
  }
})

const notifCountDown = reactive({})
let notifTimeOut = ref('')
let holdCountDown = false

const defaultTitle = computed(() => {
  if (this.success) {
    return 'Success!'
  } else if (this.warn) {
    return 'Warning'
  } else if (this.info) {
    return 'Information'
  } else if (this.error) {
    return 'Error'
  }
})

const notificationColor = computed(() => {
  if (props.notification.type.toString() === 'success') {
    return 'text-green-400'
  } else if (props.notification.type.toString() === 'info') {
    return 'text-main-400'
  } else if (props.notification.type.toString() === 'warn') {
    return 'text-red-200'
  } else if (props.notification.type.toString() === 'error') {
    return 'text-red-400'
  }
})

const notificationIcon = computed(() => {
  if (props.notification.icon) {
    return props.notification.icon
  } else if (props.notification.type.toString() === 'success') {
    return 'CheckCircleIcon'
  } else if (props.notification.type.toString() === 'info') {
    return 'InformationCircleIcon'
  } else if (props.notification.type.toString() === 'warn') {
    return 'ExclamationIcon'
  } else if (props.notification.type.toString() === 'error') {
    return 'XCircleIcon'
  }
})

const success = computed(() => {
  return props.notification.type.toString() === 'success'
})

const warn = computed(() => {
  return props.notification.type.toString() === 'warn'
})

const error = computed(() => {
  return props.notification.type.toString() === 'error'
})

const info = computed(() => {
  return props.notification.type.toString() === 'info'
})

const progression = computed(() => {
  return 100 - (notifCountDown.time / notifCountDown.start * 100)
})

function hideNotificationAction () {
  notificationStore.hideNotification(props.notification)
}

function clearNotificationTimeOut () {
  holdCountDown = true
  clearTimeout(notifTimeOut)
}

function setNotificationTimeOut () {
  holdCountDown = false
  notifCountDown.start = (props.notification.time || 5000) / 2
  notifCountDown.time = (props.notification.time || 5000) / 2
  notifTimeOut = setTimeout(() => {
    notificationStore.hideNotification(props.notification)
  }, props.notification.time || 5000)
}

function refreshTimoutValue () {
  if (!holdCountDown) {
    notifCountDown.time -= 3
  }
  setTimeout(refreshTimoutValue, 3)
}

function handleClick () {
  hideNotificationAction()
  if (props.actionClick) {
    props.actionClick.call()
  }
}

onMounted(() => {
  setNotificationTimeOut()
  refreshTimoutValue()
  isLoaded.value = true
})
</script>
