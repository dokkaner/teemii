<template>
  <div class="mx-auto flex-col w-fit">
    <div class="mb-2 block overflow-hidden w-[140px] sm:w-[200px]">
      <div v-show="progression > 1" class="mb-1.5 flex h-0.5 w-full rounded-full bg-light-600/80">
        <div class="bg-accent-600/50 dark:bg-darkAccent-500/60" :style="{ width: progression + '%' }"></div>
      </div>
      <div class="flex justify-between">
        <span
            class="line-clamp-1 truncate text-left text-xs font-medium uppercase tracking-widest text-main-700 dark:text-light-500">
          <TBaseLoadingIcon v-if="contentLoading" :loading="loading" :contentLoading="contentLoading" :error="error"/>
          {{ headerText }}
        </span>
        <TBaseRating v-if="score > 0 && progression > 1" :disabled="true" v-model="starScore" colorClass="bg-orange-400"
                     sizeClass="rating-xs"/>
      </div>
      <p v-if="title" class="self-start text-xs tracking-tight text-main-400 line-clamp-1 dark:text-light-400">
        {{ title || ' - ' }}
      </p>
    </div>
    <div class="group/item block transition-all duration-1000 ease-in-out">
      <div
          class="h-[80px] sm:h-[120px] w-[140px] sm:w-[200px] overflow-hidden rounded-md
          dark:border-darkLight-500 border border-light-600/60">
        <div class="relative flex">
          <div class="overflow-visible">
            <router-link :to="to">
              <div class="h-[80px] sm:h-[120px] w-[140px] sm:w-[200px] scale-125 bg-black bg-cover bg-top bg-no-repeat"
                   :style="{'backgroundImage': `url(${image})`}">
              </div>
            </router-link>
          </div>
          <div v-show="state === 3 && progression < 2"
               class="absolute -right-8 -top-8 z-10 flex h-12 w-12 rotate-45 bg-yellow-500/90"></div>
          <span class="absolute -bottom-10 -left-8 min-h-[60px] min-w-[120px] bg-main-900 blur-xl"></span>
        </div>
      </div>
      <div class="relative -top-8 z-10 mx-auto ml-2 ">
        <div class="flex flex-wrap items-baseline justify-start gap-2">
          <TBaseActionIcon :icon="heroIcons['FolderArrowDownIcon']" tooltip="Automatic Search" @click="handleClick(1)"/>
          <TBaseActionIcon :icon="heroIcons['DocumentMagnifyingGlassIcon']" tooltip="Manual Search"
                           @click="handleClick(2)"/>
        </div>

      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, reactive } from 'vue'
import * as heroIcons from '@heroicons/vue/24/solid'
import TBaseActionIcon from '@/components/base/TBaseActionIcon.vue'
import TBaseLoadingIcon from '@/components/base/TBaseLoadingIcon.vue'

const props = defineProps({
  to: {
    type: Object,
    required: false,
    default: null
  },
  headerText: {
    type: String,
    required: false,
    default: ''
  },
  title: {
    type: String,
    required: false,
    default: ''
  },
  progressCaption: {
    type: String,
    required: false,
    default: ''
  },
  progression: {
    type: Number,
    required: false,
    default: 0
  },
  active: {
    type: Boolean,
    required: false,
    default: false
  },
  image: {
    type: String,
    required: false,
    default: ''
  },
  loading: {
    type: Number,
    required: false,
    default: 0
  },
  index: {
    type: Number,
    default: null
  },
  isSelected: {
    type: Boolean,
    required: false,
    default: false
  },
  contentLoading: {
    type: Boolean,
    required: false,
    default: false
  },
  iconContentLoading: {
    type: String,
    required: false,
    default: 'DownloadIcon'
  },
  actions: {
    type: Array,
    default: null,
    required: false
  },
  score: {
    type: Number,
    default: 0
  },
  state: {
    type: Number,
    default: 0
  },
  error: {
    type: String,
    default: ''
  }
})

const starScore = ref(props.score)
const emit = defineEmits(['update:isSelected'])
const selected = reactive({})
selected.isSelected = props.isSelected

function emitValue (e) {
  selected.isSelected = !selected.isSelected
  emit('update:isSelected', selected.isSelected)
}

function handleClick (tag) {
  if (props.actions) {
    props.actions[tag]?.call()
  }
}
</script>

<style scoped>
.text-shadow {
  text-shadow: 1px 1px 2px #6a6472, 0 0 0.4em #e2d3e6, 0 0 0.4em #6a6472;
}
</style>
