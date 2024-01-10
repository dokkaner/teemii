<template>
  <div class="overflow-hidden mt-4">
    <div v-if="title" class="mx-1 flex items-center justify-between border-b border-main-200 dark:border-darkMain-600">
      <h3 class="text-lg sm:text-xl font-medium uppercase tracking-wide dark:text-light-600">
        {{ title }}
        <span
            class="relative -top-0.5 rounded bg-main-900/90 px-2 py-0.5 text-xs font-medium text-light-200 dark:bg-darkAccent-700 dark:text-light-500">
          {{ slides.length }}
        </span>
      </h3>
      <div class="hidden ml-4 mt-3 md:flex md:visible">
        <button type="button" @click="slidePrev()"
                class="rounded-md border border-transparent px-4 py-2 text-sm font-medium text-accent-400 hover:text-accent-600 dark:text-darkAccent-300 dark:hover:text-darkAccent-400">
          <ChevronLeftIcon class="h-6 w-6" aria-hidden="true"/>
        </button>
        <button type="button" @click="slideNext()"
                class="rounded-md border border-transparent px-4 py-2 text-sm font-medium text-accent-400 hover:text-accent-600 dark:text-darkAccent-300 dark:hover:text-darkAccent-400">
          <ChevronRightIcon class="h-6 w-6" aria-hidden="true"/>
        </button>
      </div>
    </div>
    <div ref="carRef"
         class="flex overflow-x-auto pb-4 sm:gap-x-8
         scrollbar-thin scrollbar-track-light-300 scrollbar-thumb-main-500 scrollbar-track-rounded-xl scrollbar-thumb-rounded-xl
         dark:scrollbar-track-darkMain-600 dark:scrollbar-thumb-darkAccent-800">
      <TBasePosterCard @click="selectSlide(index)"
                       v-show="!contentLoading" class="shrink-0" v-for="(slide, index) in slides"
                       :id="`${uID}-${index}`" :key="slide.id"
                       :to="!selectable ? slide.to : null"
                       :title="slide.title"
                       :image="slide.image"
                       :progress="slide.progress"
                       :tags="slide.tags"
                       :state="slide.state"
                       :variant="slide.variant"
                       :score="slide.score"
                       :selected="selectedSlideIdx === index"
      />

      <TBasePosterCard v-show="contentLoading" class="shrink-0" v-for="index in 10" :key="index"
                       :contentLoading="contentLoading"
                       state=0
                       variant="primary"
      />
    </div>
  </div>
</template>
<script setup>
import {
  ChevronRightIcon,
  ChevronLeftIcon
} from '@heroicons/vue/24/solid'
import { onMounted, ref, nextTick, watch } from 'vue'

const emit = defineEmits(['select'])
let slideIdx = 0
const selectedSlideIdx = ref(-1)
let slidesCount = 0
const carRef = ref(null)
const props = defineProps({
  uID: {
    type: String,
    default: 'carousel'
  },
  title: {
    type: [String, Number],
    default: ''
  },
  slides: {
    type: Array,
    default: () => []
  },
  contentLoading: {
    type: Boolean,
    default: false
  },
  selectable: {
    type: Boolean,
    default: false
  }
})

function isInViewport (element) {
  const rect = element.getBoundingClientRect()
  return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  )
}

function slideNext () {
  // find next invible slide
  for (let i = slideIdx; i < slidesCount; i++) {
    if (!isInViewport(document.getElementById(`${props.uID}-${i}`))) {
      slideIdx = i
      break
    }
  }

  const element = document.getElementById(`${props.uID}-${slideIdx}`)
  if (element) {
    element.scrollIntoView(false)
  }
}

function selectSlide (index) {
  if (!props.selectable) return
  selectedSlideIdx.value = index
  emit('select', index)
}

function slidePrev () {
  for (let i = slideIdx - 1; i >= 0; i--) {
    if (!isInViewport(document.getElementById(`${props.uID}-${i}`))) {
      slideIdx = i
      break
    }
  }

  const element = document.getElementById(`${props.uID}-${slideIdx}`)
  if (element) {
    element.scrollIntoView(false)
  }
}

const observeImages = () => {
  const lazyImages = carRef.value?.querySelectorAll('img[data-src]')
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target
        const state = img.getAttribute('data-state')
        if (state === '2') {
          img.src = img.getAttribute('data-src')
          observer.unobserve(img)
        }
        img.onload = function () {
          img.removeAttribute('data-src')
        }
      }
    })
  }, {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  })

  lazyImages.forEach((img) => {
    observer.observe(img)
  })
}

nextTick(() => {
  observeImages()
})

onMounted(() => {
  slidesCount = props.slides.length
  nextTick(() => {
    observeImages()
  })
})

watch(() => props.contentLoading, (first, second) => {
  if (second) {
    nextTick(() => {
      observeImages()
    })
  }
})
</script>
