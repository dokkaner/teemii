<template>
  <article class="group mx-auto flex" @click="handleClick">
    <TBaseContentPlaceholders v-show="contentLoading" class="pl-12">
      <TBaseContentPlaceholdersBox class="h-[150px] w-[100px] sm:h-[300px] sm:w-[200px]" :rounded="true"/>
    </TBaseContentPlaceholders>

    <span v-if="selected" class="absolute left-8 top-4 h-4 w-4 rounded-full bg-accent-500 dark:bg-darkAccent-500">
      <component :is="heroIcons['CheckIcon']" class="h-4 w-4 text-white"/>
    </span>

    <div v-show="!contentLoading" class="rounded-lg p-4 transition-shadow group-hover:shadow-lg">
      <span v-if="state === 1"
            class="animate-ping absolute h-4 w-4 rounded-full bg-accent-400 dark:bg-darkAccent-400 opacity-75"></span>
      <span v-if="state === 1" class="absolute h-4 w-4 rounded-full bg-accent-500 dark:bg-darkAccent-500">
        <component :is="heroIcons['SearchCircleIcon']" class="h-4 w-4 text-white"/>
      </span>

      <span v-if="score"
            class="absolute right-0 top-8 flex items-center justify-center w-12 rounded bg-main-500/90 dark:bg-darkMain-500/90 px-3 py-1 text-xs font-bold text-accent-400 dark:text-darkAccent-400">
        <component :is="heroIcons['HeartIcon']" class="h-3 w-3 mr-1"/>
        {{ score }}
      </span>

      <template v-if="to">
        <router-link :to="to" class="block">
          <img :src="image" :alt="title" :class="blurClass"
               class="h-[150px] w-[100px] sm:h-[300px] sm:w-[200px] rounded-lg object-cover group-hover:border-2 group-hover:border-accent-500 dark:group-hover:border-darkAccent-500 group-hover:filter-none"/>
        </router-link>
      </template>

      <img v-else :src="image" :alt="title" :class="blurClass"
           class="h-[150px] w-[100px] sm:h-[300px] sm:w-[200px] rounded-lg object-cover group-hover:border-2 group-hover:border-accent-500 dark:group-hover:border-darkAccent-500 group-hover:filter-none"/>

      <div class="w-[100px] sm:w-[200px] whitespace-nowrap flex-inline">
        <div v-if="progress" class="relative mt-2 h-1 w-full sm:w-[200px] rounded bg-main-50 dark:bg-darkMain-300">
          <div class="h-full bg-accent-600 dark:bg-darkAccent-600" :style="{ width: progress + '%' }"></div>
        </div>

        <div :class="variantClass">
          {{ title }}
        </div>

        <div v-if="tags"
             class="mt-2 flex items-center justify-between gap-x-1 text-xs text-main-400 dark:text-light-400">
          <span v-for="(tag, index) in tags.slice(0, 3)" :key="index" class="line-clamp-1 text-ellipsis">
            {{ tag }}
          </span>
        </div>
      </div>
    </div>
  </article>
</template>


<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import * as heroIcons from '@heroicons/vue/24/solid'
import TBaseContentPlaceholdersBox from '@/components/base/TBaseContentPlaceholdersBox.vue'
import TBaseContentPlaceholders from '@/components/base/TBaseContentPlaceholders.vue'

const isLoaded = ref(false)

const props = defineProps({
  title: {
    type: String,
    required: false,
    default: ''
  },
  to: {
    type: Object,
    required: false,
    default: null
  },
  score: {
    type: [String, Number],
    required: false,
    default: ''
  },
  image: {
    type: String,
    required: false,
    default: ''
  },
  progress: {
    type: Number,
    required: false,
    default: null
  },
  tags: {
    type: Array,
    required: false,
    default: () => []
  },
  blurPoster: {
    type: Boolean,
    required: false,
    default: false
  },
  variant: {
    type: String,
    default: 'primary',
    validator: function (value) {
      return (
          [
            'primary',
            'secondary'
          ].indexOf(value) !== -1
      )
    }
  },
  posterClick: {
    type: Function,
    default: null,
    required: false
  },
  state: {
    type: Number,
    default: 0,
    required: false
  },
  contentLoading: {
    type: Boolean,
    default: false,
    required: false
  },
  selected: {
    type: Boolean,
    default: false,
    required: false
  }
})
const imgRef = ref(null)

function handleClick () {
  if (props.posterClick) {
    props.posterClick.call()
  }
}

const blurClass = computed(() => {
  if (props.blurPoster) { return 'blur-lg' } else { return '' }
})

const variantClass = computed(() => {
  return {
    'text-left uppercase tracking-widest font-medium text-xs mt-4 line-clamp-1 w-[90px] sm:w-[195px] transition duration-100 group-hover:text-accent-500 dark:group-hover:text-darkAccent-500': true, // Common
    'text-main-700 dark:text-light-500': props.variant === 'primary',
    'text-main-100 dark:text-light-500': props.variant === 'secondary'
  }
})

watch(() => props.state, () => {
  nextTick(() => {
    if (imgRef.value) {
      imgRef.value.src = ''
      imgRef.value.src = imgRef.value.getAttribute('data-src')
    }
  })
})

onMounted(() => {
  isLoaded.value = true
})
</script>
