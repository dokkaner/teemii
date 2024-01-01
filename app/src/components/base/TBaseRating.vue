<template>
  <div :class="[sizeClass, '-ml-2 mt-1 rating rating-half shrink-0']">

    <input type="radio" :name="id" class="rating-hidden"/>

    <template v-for="n in 10" :key="n">
      <input :value="n / 2" :disabled="disabled" type="radio" :name="id" :class="[colorClass, 'mask', n % 2 === 1 ? 'mask-half-1' : 'mask-half-2', 'mask-star-2']"
             :checked="rate[n]" @click="emitValue" />
    </template>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'

const isLoaded = ref(false)

const props = defineProps({
  modelValue: {
    type: Number,
    default: 0
  },
  disabled: {
    type: Boolean,
    default: false
  },
  sizeClass: {
    type: String,
    default: 'rating-md',
    validator: function (value) {
      return ['rating-xs', 'rating-sm', 'rating-md', 'rating-lg'].indexOf(value) !== -1
    }
  },
  colorClass: {
    type: String,
    default: 'bg-green-500'
  }
})

const rate = computed(() => {
  return Array.from({ length: 10 }, (v, i) => i + 1).reduce((acc, cur) => {
    acc[cur] = cur <= (props.modelValue * 2)
    return acc
  }, {})
})

const id = computed(() => {
  return 'rating-' + Math.floor(Math.random() * 1000000000000000000)
})

const emit = defineEmits(['update:modelValue'])

function emitValue (e) {
  const val = e.target.value
  emit('update:modelValue', val)
}

onMounted(() => {
  isLoaded.value = true
})
</script>
