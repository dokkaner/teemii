<template>
  <div class="m-8 flow-root">
    <slot name="before-timeline"/>
    <ul role="list" class="-mb-8">
      <slot/>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const isLoaded = ref(false)

onMounted(() => {
  isLoaded.value = true
})
</script>
