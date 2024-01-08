<template>

  <Slider v-bind="$attrs"/>

</template>

<script>
import Slider from '@vueform/slider'

export default {
  components: { Slider },

  emits: ['change'],

  data: () => ({
    currentValue: 0,
    format: function (currentValue) {
      return `${currentValue}`
    },
  }),

  watch: {
    newValue (newCurrentValue) {
      this.currentValue = newCurrentValue
    },
  },

  methods: {
    emitChange (value) {
      this.$emit('change', value)
    },
  },
}
</script>

<style src="@vueform/slider/themes/default.css"></style>
