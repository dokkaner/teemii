<template>
  <TBaseContentPlaceholders v-show="contentLoading" class="">
    <TBaseContentPlaceholdersBox
        :rounded="true"
        style="width: 304px"
        :style="`height: 286px;`"
    />
  </TBaseContentPlaceholders>
  <ul>
    <li v-show="!contentLoading" class="col-span-1 flex flex-col rounded-lg text-center shadow bg-overlay"
        :style="{'--overlay-colors': 'rgba(33, 33, 33, .9), rgba(33, 33, 33, .4)', '--overlay-image': `url(${image})`}">

      <div class="flex flex-1 flex-col p-8">
        <h3 class="mt-4 text-2xl font-medium text-light-200">{{ name }}</h3>
        <div class="mt-1 flex-grow flex flex-col justify-between">
          <p class="text-sm text-light-400">{{ title }}</p>
          <span class="mt-4 rounded-full bg-light-100/80 px-2 py-1 text-xs font-medium text-light-900">{{ role }}</span>
        </div>
      </div>

      <div class="relative -top-8 h-32 overflow-hidden p-8 text-left text-light-100">
        <p class="text-xs" v-html="markdownToHtml(props.desc)"></p>
      </div>
    </li>
  </ul>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { markdownToHtml } from '@/composables/useUXHelpers.js'

const isLoaded = ref(false)

const props = defineProps({
  to: {
    type: Object,
    required: false,
    default: null
  },
  name: {
    type: String,
    required: false,
    default: ''
  },
  title: {
    type: String,
    required: false,
    default: ''
  },
  role: {
    type: String,
    required: false,
    default: ''
  },
  desc: {
    type: String,
    required: false,
    default: ''
  },
  image: {
    type: String,
    required: false,
    default: ''
  },
  contentLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:isSelected'])

onMounted(() => {
  isLoaded.value = true
})
</script>
