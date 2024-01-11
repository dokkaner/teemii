<template>
  <div class="container mx-auto">
    <div class="grid min-h-full place-items-center px-6 py-24 sm:py-32 lg:px-8">
      <div class="text-center">
        <p class="text-base font-semibold text-main-500 dark:text-light-400">404</p>
        <h1 class="mt-4 text-3xl font-bold tracking-tight text-main-500 dark:text-light-400 sm:text-5xl">Page not
          found</h1>
        <p class="mt-6 text-base leading-7 text-main-400 dark:text-light-500">Sorry, we couldn’t find the page you’re
          looking for.</p>
        <div class="mt-10 flex items-center justify-center gap-x-6">
          <div class="my-auto">
            <img src="/assets/images/notfound.webp" alt="Page not found">
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineOptions({
  name: 'NotFound',
  inheritAttrs: false,
  customOptions: {}
})
</script>
