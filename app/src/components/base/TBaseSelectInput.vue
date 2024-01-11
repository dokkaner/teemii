<template>
  <TBaseContentPlaceholders v-if="contentLoading">
    <TBaseContentPlaceholdersBox :rounded="true" class="h-10 w-full"/>
  </TBaseContentPlaceholders>

  <Listbox v-else v-model="selectedValue" as="div" v-bind="$attrs">
    <ListboxLabel v-if="label" class="mb-0.5 block text-sm font-medium not-italic text-main-800">
      {{ label }}
    </ListboxLabel>

    <div class="relative">
      <ListboxButton
          class="relative w-full cursor-default rounded-md border bg-white py-2 pl-3 pr-10 text-xs text-left shadow-sm focus:outline-none sm:text-sm dark:border-darkMain-300 dark:bg-darkMain-800 dark:text-darkLight-300 dark:focus:ring-darkAccent-400 dark:focus:border-darkAccent-400">
        <span v-if="getValue(selectedValue)" class="block truncate dark:text-darkAccent-300">
          {{ getValue(selectedValue) }}
        </span>
        <span v-else-if="placeholder" class="block truncate text-gray-400 dark:text-darkAccent-400">
          {{ placeholder }}
        </span>
        <span v-else class="block truncate text-gray-400 dark:text-darkAccent-400">
          Please select an option
        </span>
        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <TBaseIcon name="SelectorIcon" class="text-main-400 dark:text-darkAccent-400" aria-hidden="true"/>
        </span>
      </ListboxButton>


      <transition leave-active-class="transition duration-100 ease-in" leave-from-class="opacity-100"
                  leave-to-class="opacity-0">
        <ListboxOptions
            class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm dark:bg-darkMain-800 dark:text-darkLight-300">
          <ListboxOption v-for="option in options" :key="option.id" :value="option" as="template"
                         v-slot="{ active, selected }">
            <ul>
              <li :class="getOptionClasses(active, selected)">
                <span :class="getOptionLabelClasses(selected)">{{ getValue(option) }}</span>
                <span v-if="selected" :class="getOptionCheckmarkClasses(active)">
                  <TBaseIcon name="CheckIcon" aria-hidden="true" class="dark:text-darkAccent-400"/>
                </span>
              </li>
            </ul>
          </ListboxOption>
          <slot/>
        </ListboxOptions>
      </transition>
    </div>
  </Listbox>
</template>

<script setup>
import { ref, watch } from 'vue'
import {
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions
} from '@headlessui/vue'

const props = defineProps({
  contentLoading: {
    type: Boolean,
    default: false
  },
  modelValue: {
    type: [String, Number, Boolean, Object, Array],
    default: ''
  },
  options: {
    type: Array,
    required: true
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  labelKey: {
    type: [String],
    default: 'label'
  },
  valueProp: {
    type: String,
    default: null
  },
  multiple: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

let selectedValue = ref(props.modelValue)

function isObject (val) {
  return typeof val === 'object' && val !== null
}

function getValue (val) {
  if (isObject(val)) {
    return val[props.labelKey]
  }
  return val
}

function getOptionClasses (active, selected) {
  return [
    active ? 'bg-accent-100 dark:bg-darkAccent-100 text-accent-800 dark:text-darkAccent-800' : 'text-main-900 dark:text-darkAccent-100',
    'relative cursor-default select-none py-2 pl-3 pr-9',
  ]
}

function getOptionCheckmarkClasses (active) {
  return [
    active ? 'bg-accent-100 dark:bg-darkAccent-100 text-accent-800 dark:text-darkAccent-800' : 'bg-white dark:bg-darkMain-800 text-accent-600 dark:text-darkAccent-600',
    'absolute inset-y-0 right-0 flex items-center pr-4',
  ]
}

function getOptionLabelClasses (selected) {
  return [
    selected ? 'font-semibold' : 'font-normal',
    'block truncate',
  ]
}

watch(
    () => props.modelValue,
    () => {
      if (props.valueProp && props.options.length) {
        selectedValue.value = props.options.find((val) => {
          if (val[props.valueProp]) {
            return val[props.valueProp] === props.modelValue
          }
        })
      } else {
        selectedValue.value = props.modelValue
      }
    }
)

watch(selectedValue, (val) => {
  if (props.valueProp) {
    emit('update:modelValue', val[props.valueProp])
  } else {
    emit('update:modelValue', val)
  }
})
</script>
