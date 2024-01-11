<template>
  <button type="button"
          :disabled="disabled"
          class="mx-auto flex flex-col justify-center"
          :class="[defaultClass, roundedClass, sizeClass, variantClass]">

    <component v-if="isLoaded && icon" :is="heroIcons[icon]" :class="iconLeftClass"/>

    <svg v-if="contentLoading" class="-ml-1 mr-3 h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg"
         fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>

    <slot/>

  </button>
</template>


<script setup>
import { computed, ref, onMounted } from 'vue'
import * as heroIcons from '@heroicons/vue/24/solid'

const isLoaded = ref(false)

const props = defineProps({
  defaultClass: {
    type: String,
    default:
        'inline-flex whitespace-nowrap items-center border focus:outline-none focus:ring-2 focus:ring-offset-2 flex-1 shadow-sm'
  },
  contentLoading: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  rounded: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'md',
    validator: function (value) {
      return ['xs', 'sm', 'md', 'lg', 'xl'].indexOf(value) !== -1
    }
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
  icon: {
    type: String,
    default: '',
    required: false
  }
})

const iconLeftClass = computed(() => {
  return {
    'ml-0.5 mr-2 h-4 w-4': props.size === 'sm',
    'ml-1 mr-2 h-5 w-5': props.size === 'md',
    'ml-1 mr-3 h-5 w-5': props.size === 'lg' || props.size === 'xl'
  }
})

const variantClass = computed(() => {
  //'dark:text-darkLight-50 dark:bg-darkAccent-500 dark:hover:bg-darkAccent-300  dark:focus:ring-darkAccent-500
  return {
    'text-white border border-transparent bg-accent-500 hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 dark:text-light-200 dark:bg-darkAccent-500 dark:hover:bg-darkAccent-300 dark:focus:ring-darkAccent-500':
        props.variant === 'primary',
    'dark:text-light-200 dark:bg-darkMain-500 dark:hover:bg-darkMain-300 dark:focus:ring-darkMain-500 text-main-700 dark:border-darkMain-300 border border-light-600 bg-light-300 hover:bg-light-600 focus:outline-none focus:ring-2 focus:ring-light-500 focus:ring-offset-2':
        props.variant === 'secondary'
  }
})

const progressVariantClass = computed(() => {
  return {
    'bg-[#c90075] h-1':
        props.variant === 'primary',
    'bg-accent-500 h-1':
        props.variant === 'secondary'
  }
})

const sizeClass = computed(() => {
  return {
    'px-2.5 py-1.5 text-xs leading-4 rounded h-10': props.size === 'xs',
    'px-3 py-2 text-sm leading-4 rounded-md h-10': props.size === 'sm',
    'px-4 py-2 text-sm leading-5 rounded-md h-10': props.size === 'md',
    'px-4 py-2 text-base leading-6 rounded-md h-10': props.size === 'lg',
    'px-6 py-3 text-base leading-6 rounded-md h-10': props.size === 'xl'
  }
})

const roundedClass = computed(() => {
  return props.rounded ? '!rounded-md' : ''
})

onMounted(() => {
  isLoaded.value = true
})
</script>
