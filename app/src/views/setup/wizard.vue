<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <span class="text-main-700">Database</span>
        <span class="ml-2 text-main-500">
          <svg class="size-3" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </span>
      </div>
      <div class="flex items-center">
        <span class="text-main-700">Storage</span>
        <span class="ml-2 text-main-500">
          <svg class="size-3" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </span>
      </div>
      <div class="flex items-center">
        <span class="text-main-700">Language</span>
        <span class="ml-2 text-main-500">
          <svg class="size-3" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </span>
      </div>
      <div class="flex items-center">
        <span class="text-main-700">Finish</span>
        <span class="ml-2 text-main-500">
          <svg class="size-3" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
          </svg>
        </span>
      </div>
    </div>
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'SetupWizard'
}
</script>
