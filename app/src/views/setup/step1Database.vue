<template>
  <div class="flex flex-col gap-4">
    <div class="rounded-lg border border-main-100 bg-white">
      <div class="divide-y divide-main-100">
        <div class="p-4">
          <h2 class="text-lg font-medium text-main-900">Database Configuration</h2>
          <p class="mt-1 text-sm text-main-700">Configure your database settings.</p>
        </div>
        <div class="px-4 py-5 sm:p-6">
          <div class="grid grid-cols-6 gap-6">
            <div class="col-span-6 sm:col-span-3">
              <label for="dbPath" class="block text-sm font-medium text-gray-700">Database Path</label>
              <div class="mt-1 flex rounded-md shadow-sm">
                <input
                  v-model="dbPath"
                  type="text"
                  name="dbPath"
                  id="dbPath"
                  class="block w-full min-w-0 flex-1 rounded-none rounded-l-md border-gray-300 px-3 py-2 focus:border-accent-500 focus:ring-accent-500 sm:text-sm"
                  :class="{
                    'border-green-400 bg-green-50': isValid && dbPath
                  }"
                />
                <button
                  type="button"
                  class="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-accent-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2"
                  @click="selectPath"
                >
                  <span class="text-green-700">Browse</span>
                </button>
              </div>
              <p v-if="isValid && dbPath" class="mt-2 text-sm text-green-700">
                Database path is valid.
              </p>
            </div>
          </div>
        </div>
        <div class="px-4 py-3 text-right sm:px-6">
          <button
            type="button"
            class="inline-flex justify-center rounded-md border border-transparent bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus-visible:outline-accent-600"
            @click="next"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '../../../stores/store'

export default {
  name: 'DatabaseSetup',
  setup () {
    const store = useStore()
    const router = useRouter()
    const dbPath = ref('')
    const isValid = ref(false)

    const selectPath = async () => {
      // Implementation for selecting path
      console.warn('Path selection not implemented')
    }

    const next = () => {
      if (isValid.value) {
        store.setDbPath(dbPath.value)
        router.push('/setup/step2')
      }
    }

    return {
      dbPath,
      isValid,
      selectPath,
      next
    }
  }
}
</script>
