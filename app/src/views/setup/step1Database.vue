<template>
  <TBaseWizardStep
      title="Say hello to Teemii!"
      description="This wizard will guide you through the installation process. First, we need to create a database for your application.
      check the path indicated below, these are automatically defined via the local .env file, or via dockerfile / docker-compose."
  >
    <div v-show="backendSys.value?.system?.isDocker" class="my-6 flex gap-2.5 rounded-md border border-emerald-500/20 bg-emerald-50/50 p-2 text-xs leading-6 text-emerald-900">
      <svg viewBox="0 0 16 16" aria-hidden="true" class="mt-1 h-4 w-4 flex-none fill-emerald-500 stroke-white"><circle cx="8" cy="8" r="8" stroke-width="0"></circle><path fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6.75 7.75h1.5v3.5"></path><circle cx="8" cy="4" r=".5" fill="none"></circle></svg>
        <p>
          It appears that Teemii is running in a container. Your path preferences are defined in the docker-compose or in the server's dockerfile.
        </p>
    </div>
    <form action="" @submit.prevent="next">
      <div class="mt-6 border-t border-b border-main-100">
        <dl class="divide-y divide-main-100">
          <div class="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt class="text-sm font-medium leading-6 text-main-900">Storage / Database</dt>
            <dd class="mt-1 text-sm text-right leading-6 text-main-700 sm:col-span-2 sm:mt-0">{{backendSys.value?.system.paths.sqlite}}</dd>
          </div>
        </dl>
      </div>

      <div v-if="step.isInvalid" class="border-l-4 border-yellow-400 bg-yellow-50 p-4">
        <div class="flex">
          <div class="shrink-0">
            <TBaseIcon name="ExclamationIcon" aria-hidden="true" class="h-5 w-5 text-yellow-700"/>
          </div>
          <div class="ml-3">
            <div class="text-sm text-yellow-700">
              An issue occurred while creating the database.
              {{ ' ' }}
              <span class="font-medium text-yellow-700 underline">{{ step.msg }}.</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="step.isSuccessful" class="border-l-4 border-green-400 bg-green-50 p-4">
        <div class="flex">
          <div class="shrink-0">
            <TBaseIcon name="CheckCircleIcon" aria-hidden="true" class="h-5 w-5 text-accent-700"/>
          </div>
          <div class="ml-3">
            <div class="text-sm text-green-700">
              Database created successfully.
              {{ ' ' }}
              <p class="font-medium text-green-700 underline">{{ step.msg }}.</p>
            </div>
          </div>
        </div>
      </div>
      <div class="flex-auto">
        <div v-if="!step.isSuccessful" class="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
          <button type="submit"
                  class="inline-flex w-full justify-center rounded-md bg-accent-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 sm:col-start-2">
            Next
          </button>
        </div>
      </div>
    </form>

  </TBaseWizardStep>
</template>
<script setup>
import {  reactive } from 'vue'
import { backendSys } from '@/global'
import libraryAPI from '../../api/library.js'
import * as heroIcons from '@heroicons/vue/24/solid/index.js'

const step = reactive({
  folder: '',
  isInvalid: false,
  isSuccessful: false,
  msg: ''
})

async function finalizeStep (payload) {
  let result = false
  const res = await libraryAPI.postCreateDB()

  if (res.success) {
    step.msg = res.body.path
    result = true
    step.isSuccessful = true
  } else {
    step.msg = res.message + '. ' + res.data.message
    step.isInvalid = true
  }
  return result
}

const emit = defineEmits(['next'])

async function next () {
  const path = step.folder
  if (await finalizeStep()) {
    setTimeout(() => {
      emit('next', 2)
    }, 900)
  }
}

</script>
