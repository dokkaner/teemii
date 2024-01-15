<template>
  <TabPanel :class="[tabPanelContainer, 'focus:outline-none']">
    <slot/>
  </TabPanel>
</template>

<script setup>
import { TabPanel } from '@headlessui/vue'

const props = defineProps({
  icon: {
    type: String,
    default: '',
    required: false
  },
  title: {
    type: [String, Number],
    default: 'Tab'
  },
  count: {
    type: [String, Number],
    default: ''
  },
  countVariant: {
    type: [String, Number],
    default: ''
  },
  tabPanelContainer: {
    type: String,
    default: 'py-4 mt-px'
  },
  index: {
    type: Number,
    default: 0
  }
})

</script>
