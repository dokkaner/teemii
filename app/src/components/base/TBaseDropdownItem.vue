<template>
  <MenuItem v-slot="{ active }" v-bind="$attrs">
    <a href="#" :class="[ active ? 'bg-main-100 text-main-900' : 'text-main-700', 'group flex items-center px-4 py-2 text-sm font-normal']">
      <slot :active="active" />
    </a>
  </MenuItem>
</template>

<script setup>
import { MenuItem } from '@headlessui/vue'
</script>