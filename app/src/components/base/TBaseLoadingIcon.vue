<template>
  <span>
    <span v-if="loading < 1" class="tooltip tooltip-top cursor-pointer" data-tip="Grabbing chapter">
      <svg class="h-3 w-3 animate-spin text-accent-500 dark:text-darkAccent-400" xmlns="http://www.w3.org/2000/svg"
           fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"></circle>
        <path class="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </span>

    <span v-if="loading > 0" class="inline-flex" data-tip="Downloading">
      <TBaseRadialProgress class="top-0.5" :completed-steps="loading" :diameter="12" :strokeWidth="2"
                           :innerStrokeWidth="1"></TBaseRadialProgress>
    </span>
  </span>
  <div v-if="error" class="inline-flex text-red-500 mx-2">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 -6 24 28" stroke-width="1.0" stroke="currentColor"
         class="w-[14px] h-[14px]">
      <path stroke-linecap="round" stroke-linejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>
    </svg>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'
import * as heroIcons from '@heroicons/vue/24/outline'

const props = defineProps({
  loading: {
    type: Number,
    required: true
  },
  error: {
    type: String,
    default: ''
  }
})
</script>
