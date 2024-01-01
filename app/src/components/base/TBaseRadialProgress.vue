<template>
  <RadialProgress
      :diameter="diameter"
      :completed-steps="completedSteps"
      :total-steps="totalSteps"
      :innerStrokeWidth="innerStrokeWidth"
      :strokeWidth="strokeWidth"
      :innerStrokeColor="innerStrokeColor"
      :startColor="startColor"
      :stopColor="stopColor"
  >
    <slot/>
  </RadialProgress>
</template>

<script setup>

import RadialProgress from 'vue3-radial-progress'

defineProps({
  diameter: {
    type: Number,
    required: false,
    default: 70
  },
  // Sets the total steps/progress to the end.
  totalSteps: {
    type: Number,
    required: false,
    default: 100
  },
  // Sets the current progress of the inner stroke.
  completedSteps: {
    type: Number,
    required: false,
    default: 42
  },
  // Sets the start color of the inner stroke (gradient).
  startColor: {
    type: String,
    required: false,
    default: '#00c9a7'
  },
  // Sets the end color of the inner stroke (gradient).
  stopColor: {
    type: String,
    required: false,
    default: '#00c9a7'
  },
  // Sets the color of the inner stroke to be applied to the shape.
  innerStrokeColor: {
    type: String,
    required: false,
    default: '#99e9dc'
  },
  // Sets the width of the stroke to be applied to the shape.
  // Read more: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-width
  strokeWidth: {
    type: Number,
    required: false,
    default: 6
  },
  // Sets the  width of the inner stroke to be applied to the shape.
  innerStrokeWidth: {
    type: Number,
    required: false,
    default: 6
  },
  // Sets the shape to be used at the end of stroked.
  // Read more: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-linecap
  strokeLinecap: {
    type: String,
    required: false,
    default: 'round'
  },
  // Sets how long the animation should take to complete one cycle.
  // Read more: https://www.w3schools.com/cssref/css3_pr_animation-duration.asp
  animateSpeed: {
    type: Number,
    required: false,
    default: 1000
  },
  // Sets the frames per seconds to update inner stroke animation.
  fps: {
    type: Number,
    required: false,
    default: 25
  },
  // Sets how the animation progresses through the duration of each cycle.
  // Read more: https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timing-function
  timingFunc: {
    type: String,
    required: false,
    default: 'linear'
  },
  // Sets the inner stroke direction.
  isClockwise: {
    type: Boolean,
    required: false,
    default: true
  }
})

</script>
