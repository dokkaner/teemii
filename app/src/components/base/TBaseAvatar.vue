<template>
  <div class="avatar w-12">
    <div class="h-10 w-10 rounded-full">
      <img :src="image" alt="avatar"/>
    </div>
  </div>
  <div class="mx-4">
    <p class="line-clamp-1 text-left text-xs font-medium uppercase tracking-widest text-main-600 dark:text-light-500">
      Author</p>
    <h5 class="line-clamp-1 text-left text-xs tracking-tight text-main-400 transition duration-100 hover:text-accent-500">
      <router-link :to="href">{{ name }}</router-link>
    </h5>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  image: {
    type: String,
    required: true
  },
  name: {
    type: [String, Number],
    default: 'author',
    required: true
  },
  href: {
    type: [String],
    default: '#',
    required: true
  }
})

const isLoaded = ref(false)

onMounted(() => {
  isLoaded.value = true
})
</script>
