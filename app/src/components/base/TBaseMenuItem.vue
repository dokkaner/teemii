<template>
  <div class="p-1">
    <MenuItem :disabled="!enabled" v-slot="{ active, disabled }">
      <button @click="handleClick"
              :class="[
                'group flex w-full items-center gap-2 px-4 py-2 text-sm rounded-md',
                active ? 'bg-light-300 text-main-900 dark:bg-darkAccent-500 dark:text-white' : 'text-main-500 dark:text-darkAccent-100',
                enabled ? 'text-main-500' : 'text-main-200'
              ]">
        <component :is="heroIcons[icon]" v-if="isLoaded && icon" class="h-5 w-5"/>
        {{ caption }}
      </button>
    </MenuItem>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { MenuItem } from '@headlessui/vue'
import * as heroIcons from '@heroicons/vue/24/solid'

const isLoaded = ref(false)

const props = defineProps({
  caption: {
    type: String,
    required: true,
    default: ''
  },
  icon: {
    type: String,
    default: '',
    required: false
  },
  menuClick: {
    type: Function,
    default: null,
    required: false
  },
  enabled: {
    type: Boolean,
    default: true,
    required: false
  }
})

function handleClick () {
  if (props.menuClick) {
    props.menuClick.call()
  }
}

onMounted(() => {
  isLoaded.value = true
})
</script>