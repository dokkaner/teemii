<template>
  <div ref="gridRef" role="list"
       class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
    <slot/>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'

const gridRef = ref(null)

const observeImages = () => {
  const lazyImages = gridRef.value.querySelectorAll('img[data-src]')
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target
        const state = img.getAttribute('data-state')
        if (state === '2') {
          img.src = img.getAttribute('data-src')
          observer.unobserve(img)
        }
        img.onload = function () {
          img.removeAttribute('data-src')
        }
      }
    })
  }, {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  })

  lazyImages.forEach((img) => {
    observer.observe(img)
  })
}

nextTick(() => {
  observeImages()
})

onMounted(() => {
  nextTick(() => {
    observeImages()
  })
})
</script>
