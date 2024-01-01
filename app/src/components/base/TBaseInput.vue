<template>

  <div :class="[containerClass, computedContainerClass]" class="font-base relative rounded-md shadow-sm">
    <div v-if="loading && loadingPosition === 'left'" class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
      <svg class="h-5 w-5 animate-spin text-main-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>

    <div v-else-if="hasLeftIconSlot" class="absolute inset-y-0 left-0 flex items-center pl-3">
      <component :is="heroIcons[iconLeft]" v-if="isLoaded && iconLeft" class="h-5 w-5 text-main-400"/>
    </div>

    <div v-if="inlineAddon" class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
      <span class="text-main-500 sm:text-sm">{{ inlineAddon }}</span>
    </div>

    <span v-if="addon" class="inline-flex items-center rounded-l-md border border-r-0 border-main-200 bg-main-50 px-3 text-main-500 sm:text-sm">
      {{ addon }}
    </span>

    <input v-bind="$attrs" :type="type" :value="modelValue" :disabled="disabled" :class="[defaultInputClass, inputPaddingClass, inputAddonClass, inputInvalidClass, inputDisabledClass]" @input="emitValue"/>

    <div v-if="loading && loadingPosition === 'right'" class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
      <svg class="h-5 w-5 animate-spin text-main-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>

    <div v-if="hasRightIconSlot" class="absolute inset-y-0 right-0 flex items-center pr-3">
      <component :is="heroIcons[iconRight]" v-if="isLoaded && iconRight" class="h-5 w-5 text-main-400"/>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import * as heroIcons from '@heroicons/vue/24/solid'

const props = defineProps({
  contentLoading: {
    type: Boolean,
    default: false
  },
  type: {
    type: [Number, String],
    default: 'text'
  },
  modelValue: {
    type: [String, Number],
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  },
  loadingPosition: {
    type: String,
    default: 'left'
  },
  addon: {
    type: String,
    default: null
  },
  inlineAddon: {
    type: String,
    default: ''
  },
  invalid: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  containerClass: {
    type: String,
    default: ''
  },
  contentLoadClass: {
    type: String,
    default: ''
  },
  defaultInputClass: {
    type: String,
    default:
        'py-2 px-2 font-base block bg-white border w-full sm:text-sm border-main-200 rounded-md text-main-900 placeholder-main-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-accent-600 focus:ring-white focus:border-white sm:text-sm'
  },
  iconLeft: {
    type: String,
    default: '',
    required: false
  },
  iconRight: {
    type: String,
    default: '',
    required: false
  },
  modelModifiers: {
    default: () => ({})
  }
})
// py-2 pl-10 pr-3  leading-5
const isLoaded = ref(false)

const emit = defineEmits(['update:modelValue'])

const hasLeftIconSlot = computed(() => {
  return !!props.iconLeft || (props.loading && props.loadingPosition === 'left')
})

const hasRightIconSlot = computed(() => {
  return !!props.iconRight || (props.loading && props.loadingPosition === 'right')
})

const inputPaddingClass = computed(() => {
  if (hasLeftIconSlot.value && hasRightIconSlot.value) {
    return 'px-10'
  } else if (hasLeftIconSlot.value) {
    return 'pl-10'
  } else if (hasRightIconSlot.value) {
    return 'pr-10'
  }

  return ''
})

const inputAddonClass = computed(() => {
  if (props.addon) {
    return 'flex-1 min-w-0 block w-full px-3 py-2 !rounded-none !rounded-r-md'
  } else if (props.inlineAddon) {
    return 'pl-7'
  }

  return ''
})

const inputInvalidClass = computed(() => {
  if (props.invalid) {
    return 'border-red-500 ring-red-500 focus:ring-red-500 focus:border-red-500'
  }

  return 'focus:ring-primary-400 focus:border-primary-400'
})

const inputDisabledClass = computed(() => {
  if (props.disabled) {
    return 'border-main-100 bg-main-100 !text-main-400 ring-main-200 focus:ring-main-200 focus:border-main-100'
  }

  return ''
})

const computedContainerClass = computed(() => {
  const containerClass = `${props.containerClass} `

  if (props.addon) {
    return `${props.containerClass} flex`
  }

  return containerClass
})

function emitValue (e) {
  let val = e.target.value
  if (props.modelModifiers.uppercase) {
    val = val.toUpperCase()
  }

  emit('update:modelValue', val)
}

onMounted(() => {
  isLoaded.value = true
})
</script>
