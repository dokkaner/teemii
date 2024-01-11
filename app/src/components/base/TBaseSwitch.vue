<template>
  <SwitchGroup>
    <div class="flex flex-row items-stretch justify-between">
      <SwitchLabel v-if="labelLeft" class="mr-4 cursor-pointer text-sm not-italic text-main-400 dark:text-main-200">
        {{ labelLeft }}
      </SwitchLabel>

      <Switch v-if="size === 'md'" v-model="enabled"
              :class="['relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-accent-500 dark:focus:ring-darkAccent-500', enabled ? 'bg-accent-500 dark:bg-darkAccent-500' : 'bg-light-600 dark:bg-darkMain-600']"
              v-bind="$attrs">
        <span
            :class="['inline-block h-4 w-4 rounded-full bg-white transition-transform', enabled ? 'translate-x-6' : 'translate-x-1']"/>
      </Switch>

      <Switch v-else v-model="enabled"
              :class="['relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none focus:ring-accent-500 dark:focus:ring-darkAccent-500>', enabled ? 'bg-accent-500 dark:bg-darkAccent-500' : 'bg-light-600 dark:bg-darkMain-600']"
              v-bind="$attrs">
        <span
            :class="['inline-block h-2 w-2 rounded-full bg-white transition-transform', enabled ? 'translate-x-5' : 'translate-x-1']"/>
      </Switch>

      <SwitchLabel v-if="labelRight" class="ml-4 cursor-pointer text-sm not-italic text-main-400 dark:text-main-200">
        {{ labelRight }}
      </SwitchLabel>
    </div>
  </SwitchGroup>
</template>

<script setup>
import { computed } from 'vue'
import { Switch, SwitchGroup, SwitchLabel } from '@headlessui/vue'

const props = defineProps({
  labelLeft: {
    type: String,
    default: ''
  },
  labelRight: {
    type: String,
    default: ''
  },
  modelValue: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'md'
  }
})

const emit = defineEmits(['update:modelValue'])

const enabled = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>
