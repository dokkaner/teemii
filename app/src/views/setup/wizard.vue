<template>
  <div class="mx-auto w-full max-w-xl rounded-lg bg-white shadow-xl">
    <div class="flex place-content-center">
      <img id="logo" src="/assets/icons/logo.png" alt="Teemii" class="m-10 h-24"/>
    </div>

    <TBaseWizard :steps="3" :current-step="currentStepNumber" @click="onNavClick">
      <component :is="stepComponent" @next="onStepChange" @prev="onStepBack"/>
    </TBaseWizard>
  </div>
  <div class="flex w-full">
  <div class="mx-auto">
      <span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-main-700">
        <component :is="heroIcons['CommandLineIcon']" class="m-1 h-3 w-3 cursor-pointer text-main-500" />
        {{backendSys.value?.system?.platform}}
      </span>
      <span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-main-700">
        <component :is="heroIcons['CpuChipIcon']" class="m-1 h-3 w-3 cursor-pointer text-main-500" />
        Node: {{backendSys.value?.system?.nodeversion}}
      </span>
      <span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-main-700">
        <component :is="heroIcons['CodeBracketIcon']" class="m-1 h-3 w-3 cursor-pointer text-main-500" />
        Teemii v.{{backendSys.value?.system?.appVersion}}
      </span>
      <span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-main-700">
        <component :is="heroIcons['MapPinIcon']" class="m-1 h-3 w-3 cursor-pointer text-main-500" />
        {{backendSys.value?.system?.configPath}}
      </span>
  </div>
  </div>

</template>

<script>
import { onMounted, ref } from 'vue'
import step1 from './step1Database.vue'
import step2 from './step2Storage.vue'
import step3 from './step3Lang.vue'
import router from '../../router'
import * as heroIcons from '@heroicons/vue/24/solid/index.js'
import { backendSys } from '@/global.js'
import apiLibrary from '@/api/library.js'

export default {
  name: 'Wizard',
  computed: {
    backendSys () {
      return backendSys
    },
    heroIcons () {
      return heroIcons
    }
  },
  components: {
    step_1: step1,
    step_2: step2,
    step_3: step3
  },
  setup () {
    const stepComponent = ref('step_1')
    const currentStepNumber = ref(1)

    checkCurrentProgress()

    async function checkCurrentProgress () {
      const res = await fetch('/api/v1/setup')

      if (res.setupCompleted) {
        await router.push({ name: 'Home' })
      }

      // currentStepNumber.value = currentStepNumber.value + 1
      // stepComponent.value = `step_${currentStepNumber.value + 1}`
    }

    async function onStepBack () {
      currentStepNumber.value--

      if (currentStepNumber.value >= 1) {
        stepComponent.value = 'step_' + currentStepNumber.value
      }
    }

    async function onStepChange () {
      currentStepNumber.value++

      if (currentStepNumber.value <= 4) {
        stepComponent.value = 'step_' + currentStepNumber.value
      }
    }

    function onNavClick (e) {}

    onMounted(() => {
      document.title = 'Setup'
      apiLibrary.getSystemStatus().then((res) => {
        if (res.success) {
          backendSys.value = res.body
        }
      })
    })

    // expose
    return {
      stepComponent,
      currentStepNumber,
      onStepChange,
      onStepBack,
      onNavClick
    }
  }
}
</script>
