<template>
  <vueper-slides class="no-shadow" bullets-outside :arrows="false" fixed-height="300px" :visible-slides="1" :gap="3"
                 :slide-ratio="1 / 2" :dragging-distance="70">
    <vueper-slide v-for="(slide, index) in props.slides" :key="index" v-bind="slide"
                  class="overflow-hidden rounded-box drop-shadow-lg">
      <template #content>
        <router-link :to="slide.route">
          <div
              class="h-full space-y-2 bg-gradient-to-b from-main-800/80 to-transparent py-16 text-white md:space-y-4 lg:h-[65vh] lg:justify-end lg:pb-12">
            <h1 class="m-4 text-xl font-bold leading-4 md:text-2xl lg:text-4xl">{{ slide.title }}</h1>
            <p class="textarea-xs line-clamp-4 max-h-32 max-w-xs md:textarea-md md:max-w-lg lg:max-w-2xl">
              {{ slide.description }}</p>
          </div>
        </router-link>
      </template>
    </vueper-slide>
  </vueper-slides>
</template>

<script setup>
import { VueperSlides, VueperSlide } from 'vueperslides'
import 'vueperslides/dist/vueperslides.css'

const props = defineProps({
  slides: {
    type: Array
  }
})
</script>
<style>
@media (prefers-color-scheme: light) {
  .vueperslides__bullet .default {
    background-color: #e2d3e6;
    border: none;
    box-shadow: none;
    transition: all 0.3s ease-in-out;
    width: 12px;
    height: 12px;
    transform-origin: center;
  }

  .vueperslides__bullet--active .default {
    background-color: #00c9a7;
    width: 20px;
  }

  .vueperslides__bullet span {
    display: block;
    color: #fff;
    font-size: 10px;
    opacity: 0.8;
  }
}

@media (prefers-color-scheme: dark) {
  .vueperslides__bullet .default {
    background-color: #b3b9e3;
    border: none;
    box-shadow: none;
    transition: all 0.3s ease-in-out;
    width: 12px;
    height: 12px;
    transform-origin: center;
  }

  .vueperslides__bullet--active .default {
    background-color: #685dae;
    width: 20px;
  }

  .vueperslides__bullet span {
    display: block;
    color: #fff;
    font-size: 10px;
    opacity: 0.8;
  }
}

</style>
