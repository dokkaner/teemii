<template>
  <RadioGroup v-model="selected">
    <RadioGroupLabel class="sr-only">Privacy setting</RadioGroupLabel>
    <div class="-space-y-px rounded-md">
      <RadioGroupOption :id="id" as="template" :value="value" :name="name" v-bind="$attrs" v-slot="{ checked, active }">
        <div class="relative flex cursor-pointer focus:outline-none">
          <span :class="[
                checked ? checkedStateClass : unCheckedStateClass,
                active ? optionGroupActiveStateClass : '',
                optionGroupClass,
              ]" aria-hidden="true">
            <span class="h-1.5 w-1.5 rounded-full bg-white"/>
          </span>
          <div class="ml-3 flex flex-col">
            <RadioGroupLabel as="span" :class="[
                  checked ? checkedStateLabelClass : unCheckedStateLabelClass,
                  optionGroupLabelClass,
                ]">
              {{ label }}
            </RadioGroupLabel>
          </div>
        </div>
      </RadioGroupOption>
    </div>
  </RadioGroup>
</template>

<script setup>
import { computed } from 'vue'
import { RadioGroup, RadioGroupLabel, RadioGroupOption } from '@headlessui/vue'

const props = defineProps({
  id: {
    type: [String, Number],
    required: false,
    default: () => `radio_${Math.random().toString(36).substring(2, 9)}`
  },
  label: {
    type: String,
    default: ''
  },
  modelValue: {
    type: [String, Number],
    default: ''
  },
  value: {
    type: [String, Number],
    default: ''
  },
  name: {
    type: [String, Number],
    default: ''
  },
  checkedStateClass: {
    type: String,
    default: 'bg-accent-600'
  },
  unCheckedStateClass: {
    type: String,
    default: 'bg-white'
  },
  optionGroupActiveStateClass: {
    type: String,
    default: 'ring-2 ring-offset-2 ring-accent-500'
  },
  checkedStateLabelClass: {
    type: String,
    default: 'text-accent-900 '
  },
  unCheckedStateLabelClass: {
    type: String,
    default: 'text-main-900'
  },
  optionGroupClass: {
    type: String,
    default:
        'h-4 w-4 mt-0.5 cursor-pointer rounded-full border flex items-center justify-center'
  },
  optionGroupLabelClass: {
    type: String,
    default: 'block text-sm font-light'
  }
})

const emit = defineEmits(['update:modelValue'])

const selected = computed({
  get: () => props.modelValue,
  set: (modelValue) => emit('update:modelValue', modelValue)
})
</script>
