<template>
  <transition
      enter-active-class="transition duration-500 ease-in-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in-out"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
  >
    <div v-show="true" class="relative z-10 rounded  p-4 md:p-8">
      <slot name="filter-header"/>
      <label
          class="absolute right-4 top-2.5 cursor-pointer text-main-700 hover:text-accent-700"
          @click="$emit('clear')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 32 32">
          <path fill="currentColor"
                d="M7 27h23v2H7zm20.38-16.49l-7.93-7.92a2 2 0 0 0-2.83 0l-14 14a2 2 0 0 0 0 2.83L7.13 24h9.59l10.66-10.66a2 2 0 0 0 0-2.83zM15.89 22H8l-4-4l6.31-6.31l7.93 7.92zm3.76-3.76l-7.92-7.93L18 4l8 7.93z"/>
        </svg>
      </label>

      <div
          class="flex flex-col space-y-3"
          :class="
          rowOnXl
            ? 'xl:flex-row xl:space-x-4 xl:space-y-0 xl:items-center'
            : 'lg:flex-row lg:space-x-4 lg:space-y-0 lg:items-center'
        "
      >
        <slot/>
      </div>
    </div>
  </transition>
</template>

<script setup>

defineProps({
  show: {
    type: Boolean,
    default: false
  },
  rowOnXl: {
    type: Boolean,
    default: false
  }
})

defineEmits(['clear'])
</script>
