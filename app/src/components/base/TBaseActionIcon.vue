<template>
  <div class="tooltip tooltip-top cursor-pointer" :data-tip="tooltip">
    <span
        class="block rounded-full p-1 text-light-50 bg-main-800 dark:text-darkAccent-200 transition duration-200 ease-in
        hover:bg-accent-500 dark:hover:bg-darkAccent-400"
        :class="[props.background ? 'bg-main-800 dark:bg-darkAccent-500' : 'bg-transparent']">
      <component :is="icon" class="h-5 w-5" @click="onClick"/>
    </span>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'

const props = defineProps({
  icon: {
    type: Object,
    required: true
  },
  tooltip: {
    type: String,
    required: true
  },
  onClick: {
    type: Function,
    required: true
  },
  background: {
    type: Boolean,
    required: false,
    default: false
  }
})
</script>
