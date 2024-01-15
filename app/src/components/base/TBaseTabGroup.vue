<template>
  <div>
    <TabGroup :default-index="defaultIndex" @change="onChange">
      <TabList :class="['flex relative overflow-x-auto overflow-y-hidden  lg:ml-0 lg:pb-0', alignClass]">
        <Tab v-for="(tab, index) in tabs" :key="index" as="template" v-slot="{ selected }">
          <button :class="['px-8 py-2 gap-x-2 text-sm leading-5 font-medium flex items-center relative border-b-2 ' +
           'focus:outline-none whitespace-nowrap', selected ? variantClassSelected : variantClassNonSelected]">
            <component :is="heroIcons[tab.icon]" v-if="isLoaded && tab.icon" class="h-5 w-5"/>
            <span class="text-base font-medium">{{ tab.title }}</span>
            <span v-if="tab.count"
                  class="ml-1 inline-flex items-center rounded bg-main-800 px-2 py-0.5 text-xs text-light-400">{{
                tab.count
              }}</span>
          </button>
        </Tab>
      </TabList>

      <slot name="before-tabs"/>

      <TabPanels>
        <slot/>
      </TabPanels>
    </TabGroup>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, useSlots } from 'vue'
import { TabGroup, TabList, TabPanels, Tab } from '@headlessui/vue'
import * as heroIcons from '@heroicons/vue/24/solid'

const isLoaded = ref(false)

const props = defineProps({
  defaultIndex: {
    type: Number,
    default: 0
  },
  filter: {
    type: String,
    default: null
  },
  vAlign: {
    type: String,
    default: 'center',
    validator: function (value) {
      return (
          [
            'center',
            'left',
            'right'
          ].indexOf(value) !== -1
      )
    }
  },
  variant: {
    type: String,
    default: 'light',
    validator: function (value) {
      return (
          [
            'light',
            'dark'
          ].indexOf(value) !== -1
      )
    }
  }
})

const emit = defineEmits(['change'])
const slots = useSlots()
const tabs = computed(() => slots.default().map((tab) => tab.props))

const variantClassSelected = computed(() => {
  return {
    'whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium':
        true,
    'border-accent-500 text-accent-600 dark:border-darkAccent-400 dark:text-darkAccent-400':
        props.variant === 'light',
    'border-accent-400 text-accent-500 dark:border-darkAccent-400 dark:text-darkAccent-400':
        props.variant === 'dark'
  }
})

const variantClassNonSelected = computed(() => {
  return {
    'whitespace-nowrap border-b px-1 py-4 text-sm font-medium transition duration-300 ease-in-out':
        true,
    'border-main-300 text-main-300 hover:text-accent-300 hover:border-accent-300 dark:text-darkLight-300 dark:hover:text-darkAccent-300 dark:hover:border-darkAccent-300':
        props.variant === 'light',
    'border-main-300 text-main-300 hover:text-accent-300 hover:border-accent-200':
        props.variant === 'dark'
  }
})

const alignClass = computed(() => {
  return {
    'md:justify-center':
        props.vAlign === 'center',
    'md:justify-start':
        props.vAlign === 'start',
    'md:justify-end':
        props.vAlign === 'end'
  }
})

function onChange (d) {
  emit('change', tabs.value[d])
}

onMounted(() => {
  isLoaded.value = true
})
</script>
