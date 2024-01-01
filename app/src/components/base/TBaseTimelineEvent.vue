<template>
  <ul>
    <li :class="[liContainer, 'focus:outline-none']">
      <div class="relative pb-4">
      <span v-if="index !== length - 1" class="absolute left-4 top-4 -ml-px h-full w-0.5 bg-main-200"
            aria-hidden="true"/>
        <div class="relative flex space-x-3">
          <div>
          <span class="flex h-8 w-8 items-center justify-center rounded-full ring-8 ring-white">
            <component v-if="!loading" :is="heroIcons[icon]" class="h-5 w-5 text-main-400" aria-hidden="true"/>
            <svg v-if="loading" class="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
                 viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </span>
          </div>
          <div class="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
            <div>
              <p class="text-md font-medium text-main-500">{{ title }}</p>
              <div class="flex">
                <p :class="[colorClass.text]" class="text-xs">{{ event }}</p>
                <p v-if="progress>0 && progress<100" :class="[colorClass.text]" class="text-xs">Progress: {{ progress }}
                  %</p>
              </div>
            </div>
            <div class="whitespace-nowrap text-right text-sm text-main-500">
              <time :datetime="timeStamp"> {{ formatDate(timeStamp) }}</time>
            </div>
          </div>
        </div>
      </div>
    </li>
  </ul>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import * as heroIcons from '@heroicons/vue/24/solid'

const isLoaded = ref(false)
const props = defineProps({
  index: {
    type: Number,
    default: 0,
    required: true
  },
  length: {
    type: Number,
    default: 0,
    required: true
  },
  icon: {
    type: String,
    default: '',
    required: false
  },
  eventColor: {
    type: String,
    default: 'main-500',
    required: false
  },
  title: {
    type: [String, Number],
    default: 'Event'
  },
  event: {
    type: [String, Number],
    default: ''
  },
  progress: {
    type: Number,
    default: 0
  },
  timeStamp: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  },
  liContainer: {
    type: String,
    default: 'py-4 mt-px'
  }
})

const colorClass = computed(() => {
  return { bg: 'bg-' + props.eventColor, text: 'text-' + props.eventColor }
})

function formatDate (dateString) {
  if (dateString) {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('default', { dateStyle: 'full', timeStyle: 'long' }).format(date)
  } else {
    return ''
  }
}

onMounted(() => {
  isLoaded.value = true
})
</script>
