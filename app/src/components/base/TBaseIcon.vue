<template>
  <component v-show="solid" :is="heroIconsSolid[name]" v-if="isLoaded" class="h-5 w-5"/>
  <component v-show="!solid" :is="heroIconsOutline[name]" v-if="isLoaded" class="h-5 w-5"/>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as heroIconsOutline from '@heroicons/vue/24/outline'
import * as heroIconsSolid from '@heroicons/vue/24/solid'

const isLoaded = ref(false)

defineProps({
  name: {
    type: String,
    required: true
  },
  solid: {
    type: Boolean,
    default: false
  }
})

onMounted(() => {
  isLoaded.value = true
})
</script>
