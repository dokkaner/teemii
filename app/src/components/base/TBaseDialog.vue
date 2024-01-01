<template>
  <TransitionRoot as="template" :show="dialogStore.active">
    <Dialog as="div" class="relative z-50">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div class="sm:flex sm:items-start">
                  <div class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10"
                       :class="{
                      'bg-main-900 text-green-600': dialogStore.variant === 'primary',
                      'bg-red-100 text-red-600': dialogStore.variant === 'danger',
                      }">
                    <TBaseIcon v-if="dialogStore.variant === 'primary'" name="CheckBadgeIcon"/>
                    <TBaseIcon v-else name="ExclamationTriangleIcon" aria-hidden="true"/>
                  </div>
                  <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <DialogTitle as="h3" class="text-base font-semibold leading-6 text-gray-900">{{ dialogStore.title }}</DialogTitle>
                    <div class="mt-2">
                      <p class="text-sm text-gray-500">{{ dialogStore.message }}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">

                <button type="button"
                        class="inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto"
                        :class="{
                        'bg-main-900 text-green-600 hover:bg-green-500': dialogStore.variant === 'primary',
                        'bg-red-600 text-red-600 hover:bg-red-500': dialogStore.variant === 'danger',
                        }"
                        @click="resolveDialog(true)">
                  {{ dialogStore.yesLabel }}
                </button>
                <button type="button"
                        class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto" @click="resolveDialog(false)" ref="cancelButtonRef">
                  {{ dialogStore.noLabel }}
                </button>

              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script>
import { computed } from 'vue'
import { useDialogStore } from '@/stores/dialogsStore'
import {
  Dialog,
  DialogOverlay, DialogPanel,
  DialogTitle,
  TransitionChild,
  TransitionRoot
} from '@headlessui/vue'

export default {
  components: {
    DialogPanel,
    Dialog,
    DialogOverlay,
    DialogTitle,
    TransitionChild,
    TransitionRoot
  },
  setup () {
    const dialogStore = useDialogStore()

    function resolveDialog (resValue) {
      dialogStore.resolve(resValue)
      dialogStore.closeDialog()
    }

    const dialogSizeClasses = computed(() => {
      const size = dialogStore.size

      switch (size) {
        case 'sm':
          return 'sm:max-w-sm'
        case 'md':
          return 'sm:max-w-md'
        case 'lg':
          return 'sm:max-w-lg'

        default:
          return 'sm:max-w-md'
      }
    })

    return {
      resolveDialog,
      dialogSizeClasses,
      dialogStore
    }
  }
}
</script>
