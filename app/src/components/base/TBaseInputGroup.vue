<template>
  <div :class="containerClasses" class="relative w-full text-left">
    <TBaseContentPlaceholders v-if="contentLoading">
      <TBaseContentPlaceholdersText :lines="1" :class="contentLoadClass"/>
    </TBaseContentPlaceholders>

    <label v-else-if="label"
           :class="['flex items-center justify-between whitespace-nowrap text-sm not-italic text-light-800 dark:text-main-200', labelClasses]">
      {{ label }}
      <span v-show="required" class="text-sm text-red-500 dark:text-darkRed-500"> *</span>
      <slot v-if="hasRightLabelSlot" name="labelRight"/>
      <span v-if="tooltip" :data-tip="tooltip"
            class="tooltip tooltip-left h-4 cursor-pointer text-main-400 hover:text-main-600 dark:text-darkAccent-400 dark:hover:text-darkAccent-600">
        <TBaseIcon name="InformationCircleIcon"/>
      </span>
    </label>

    <div :class="inputContainerClasses">
      <slot></slot>
      <span v-if="helpText" class="mt-1 text-xs font-light text-main-500 dark:text-light-300">{{ helpText }}</span>
      <span v-if="error" class="mt-0.5 block text-sm text-red-500 dark:text-red-500">{{ error }}</span>
    </div>

  </div>
</template>

<script setup>
import { computed, useSlots } from 'vue'

const props = defineProps({
  contentLoading: {
    type: Boolean,
    default: false
  },
  contentLoadClass: {
    type: String,
    default: 'w-16 h-5'
  },
  label: {
    type: String,
    default: ''
  },
  variant: {
    type: String,
    default: 'vertical'
  },
  error: {
    type: [String, Boolean],
    default: null
  },
  required: {
    type: Boolean,
    default: false
  },
  tooltip: {
    type: String,
    default: null,
    required: false
  },
  helpText: {
    type: String,
    default: null,
    required: false
  }
})

const containerClasses = computed(() => {
  if (props.variant === 'horizontal') {
    return 'grid md:grid-cols-12 items-center'
  }

  return ''
})

const labelClasses = computed(() => {
  if (props.variant === 'horizontal') {
    return 'relative pr-0 pt-1 mr-3 text-sm md:col-span-4 md:text-right mb-1 md:mb-0'
  }

  return ''
})

const inputContainerClasses = computed(() => {
  if (props.variant === 'horizontal') {
    return 'md:col-span-8 md:col-start-5 md:col-ends-12'
  }

  return 'flex flex-col mt-1'
})

const slots = useSlots()

const hasRightLabelSlot = computed(() => {
  return !!slots.labelRight
})
</script>
