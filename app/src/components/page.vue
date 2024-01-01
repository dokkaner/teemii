<template>
  <img v-show="lazyLoad" src="/assets/images/404.png" :data-src="source" alt="page" :class="classDesc" :id="index">
  <img v-show="!lazyLoad" :src="source" alt="page" :class="classDesc" :id="index">
</template>

<script>

export default {
  name: 'page',
  inheritAttrs: false,
  props: {
    id: {
      type: String
    },
    index: {
      type: Number
    },
    source: {
      type: String
    },
    classDesc: {
      type: String
    },
    lazyLoad: {
      type: Boolean,
      default: false
    }
  }
}

</script>
