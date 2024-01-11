<template>
  <component :is="layout">
    <router-view/>
  </component>
</template>

<script>
import { computed, defineComponent, onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSocketStore } from '@/stores/socketsStore'

const defaultLayout = 'default'
export default defineComponent({
  name: 'Teemii',
  setup () {
    const { currentRoute } = useRouter()
    const layout = computed(
      () => `${currentRoute.value.meta.layout || defaultLayout}-layout`
    )
    const socketStore = useSocketStore()

    onMounted(async () => {
      socketStore.initializeSocket()
    })

    onBeforeUnmount(() => {
      socketStore.disconnectSocket()
    })

    return {
      layout
    }
  }
})
</script>
