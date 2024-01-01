<template>
  <div class="relative right-0 max-w-xl overflow-hidden after:absolute after:top-1/2 after:h-2 after:w-full after:-translate-y-1/2 after:bg-light-400" :class="containerClass">
    <div v-for="(number, index) in steps" :key="index" class="relative z-10">
      <div class="absolute inset-0 rounded-full bg-accent-200"></div>
      <div class="relative flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold" :class="stepStyle(number)">
        <div class="flex items-center justify-center">
          <span v-if="currentStep > number">
            <svg :class="iconClass" fill="currentColor" viewBox="0 0 20 20" @click="$emit('click', index)">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
          </span>
          <span v-else>{{ number }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    currentStep: {
      type: Number,
      default: null
    },
    steps: {
      type: Number,
      default: null
    },
    containerClass: {
      type: String,
      default: 'flex justify-between rounded p-8'
    },
    progress: {
      type: String,
      default: 'rounded-full float-left border-1 cursor-pointer'
    },
    currentStepClass: {
      type: String,
      default: 'bg-white border-accent-500 text-accent-500'
    },
    nextStepClass: {
      type: String,
      default: 'bg-white border-light-600 text-light-800'
    },
    previousStepClass: {
      type: String,
      default:
          'bg-accent-500 border-accent-500 text-accent-500'
    },
    iconClass: {
      type: String,
      default:
          'flex items-center justify-center w-full h-full text-sm font-black text-center text-white'
    }
  },

  emits: ['click'],

  setup (props) {
    function stepStyle (number) {
      if (props.currentStep === number) {
        return [props.currentStepClass, props.progress]
      }
      if (props.currentStep > number) {
        return [props.previousStepClass, props.progress]
      }
      if (props.currentStep < number) {
        return [props.nextStepClass, props.progress]
      }
      return [props.progress]
    }

    return {
      stepStyle
    }
  }
}
</script>
