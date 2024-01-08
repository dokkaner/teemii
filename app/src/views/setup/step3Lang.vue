<template>

  <TBaseWizardStep
      title="Choose your preferred language"
      description="Select the primary and alternative language you want to use in Teemii"
  >
    <form action="" @submit.prevent="next">
      <div class="relative pb-2">
        <TBaseInputGroup
            label="Preferred language (by priority order)"
            :error="v$.langs.$error && v$.langs.$errors[0].$message"
            required
        >
          <BaseMultiselect
              v-model="step.langs"
              :options="langs"
              label="name"
              track-by="name"
              value-prop="code"
              :can-deselect="false"
              :can-clear="false"
              placeholder="language"
              :invalid="v$.langs.$error"
              searchable
              :max="4"
              mode="tags"
              class="w-full"
          >
          </BaseMultiselect>

        </TBaseInputGroup>
      </div>
      <div v-if="step.isInvalid" class="border-l-4 border-yellow-400 bg-yellow-50 p-4">
        <div class="flex">
          <div class="shrink-0">
            <TBaseIcon name="ExclamationIcon" aria-hidden="true" class="h-5 w-5 text-yellow-700"/>
          </div>
          <div class="ml-3">
            <div class="text-sm text-yellow-700">
              An issue occurred while creating the library.
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
              Library created successfully.
              {{ ' ' }}
              <p class="font-medium text-green-700 underline">{{ step.msg }}.</p>
            </div>
          </div>
        </div>
      </div>
      <div class="flex-auto">
        <div v-if="!step.isSuccessful" class="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
          <button @click="emit('prev', 2)"
                  class="inline-flex w-full justify-center rounded-md bg-light-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-light-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light-600 sm:col-start-1 sm:mt-0">
            Back
          </button>
          <button type="submit"
                  class="inline-flex w-full justify-center rounded-md bg-accent-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 sm:col-start-2">
            Finish
          </button>
        </div>
      </div>
    </form>

  </TBaseWizardStep>
</template>
<script setup>
import { computed, reactive } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, helpers } from '@vuelidate/validators'
import { langs } from '@/global'
import libraryAPI from '../../api/library.js'
import router from '@/router'

const step = reactive({
  langs: [],
  isInvalid: false,
  isSuccessful: false,
  msg: ''
})

async function finalizeStep (payload) {
  let result = false
  await libraryAPI.postUserPreferences(payload)
  const res = await libraryAPI.postSetupFinalize({})

  if (res.success) {
    step.msg = res.body
    result = true
    step.isSuccessful = true
  } else {
    step.msg = res.message + '. ' + res.data.message
    step.isInvalid = true
  }
  return result
}

const rules = computed(() => ({
  langs: {
    required: helpers.withMessage('You must choose at least one language', required)
  }
}))

const v$ = useVuelidate(rules, step)

const emit = defineEmits(['next', 'prev'])

async function next () {
  v$.value.$validate()
  if (v$.value.$error) {
    return
  }
  const preferences = {
    agentOptions: { languages: step.langs }
  }

  if (await finalizeStep({ preferences })) {
    setTimeout(() => {
      router.push('/')
    }, 900)
    return true
  }
}

</script>
