<template>
  <Teleport to="body">
    <TransitionRoot appear as="template" :show="show">
      <Dialog as="div" static class="fixed inset-0 z-40 overflow-y-auto" :open="show" @close="$emit('close')">
        <div class="flex min-h-screen  items-end  justify-center  px-4 text-center sm:block sm:px-2">
          <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100"
                           leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
            <DialogOverlay
                class="fixed inset-0 bg-main-700/25 transition-opacity"
            />
          </TransitionChild>

          <span class="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
          <TransitionChild
              as="template"
              enter="ease-out duration-300"
              enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enter-to="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leave-from="opacity-100 translate-y-0 sm:scale-100"
              leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div
                :class="`inline-block align-middle bg-white dark:bg-darkMain-800 rounded-lg text-left overflow-hidden
                 relative shadow-xl transition-all dark:border-darkMain-800 my-4 ${modalSize} sm:w-full border border-main-300
                 rounded shadow-xl`"
            >
              <div v-if="hasHeaderSlot"
                   class="flex items-center justify-between px-6 py-4 text-lg font-medium text-black">
                <slot name="header"/>
              </div>

              <slot/>

              <slot name="footer"/>
            </div>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>
  </Teleport>
</template>

<script setup>
import { computed, watchEffect, useSlots } from 'vue'
import {
  Dialog,
  DialogOverlay,
  TransitionChild,
  TransitionRoot
} from '@headlessui/vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'sm'
  }
})
const slots = useSlots()

const emit = defineEmits(['close', 'open'])

watchEffect(() => {
  if (props.show) {
    emit('open', props.show)
  }
})

const modalSize = computed(() => {
  const size = props.size
  switch (size) {
    case 'sm':
      return 'sm:max-w-2xl w-full'
    case 'md':
      return 'sm:max-w-4xl w-full'
    case 'lg':
      return 'sm:max-w-6xl w-full'
    case 'xlg':
      return 'sm:max-w-8xl w-full'

    default:
      return 'sm:max-w-2xl w-full'
  }
})

const hasHeaderSlot = computed(() => {
  return !!slots.header
})
</script>
