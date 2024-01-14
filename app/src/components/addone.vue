<template>
  <div class="pointer-events-auto w-screen max-w-md ">
    <form
        action="#"
        @submit.prevent="addMedia(media.data.id)"
        class="flex h-full flex-col divide-y divide-main-200 bg-white dark:bg-darkMain-500 shadow-xl"
    >
      <div class="h-0 flex-1 overflow-y-auto">
        <div :style="{ backgroundImage: `url(${media.data.cover})` }" class="overflow-hidden bg-cover bg-no-repeat">

          <div class="bg-main-600/90 dark:bg-darkAccent-900/90 px-4 py-6 bg-blend-normal backdrop-blur-md sm:px-6 ">
            <div class="flex items-center justify-between">
              <DialogTitle class="text-lg font-medium text-white">
                Add a new manga to your collection
              </DialogTitle>
              <div class="ml-3 flex h-7 items-center">
                <button type="button"
                        class="rounded-md bg-main-500 dark:bg-darkMain-500 text-accent-200 dark:text-darkAccent-500 hover:text-accent-500 dark:hover:text-darkAccent-400"
                        @click="media.open = false"
                >
                  <span class="sr-only">Close panel</span>
                  <TBaseIcon :solid="true" name="XMarkIcon" aria-hidden="true" class="h-5 w-5 text-light-700"/>
                </button>
              </div>
            </div>
            <div class="mt-4">
              <p class="text-sm text-light-400">
                Click on Add to add this title to your collection
              </p>
            </div>
          </div>
        </div>

        <div class="flex flex-1 flex-col justify-between">
          <div class="px-4 sm:px-6">
            <div class="space-y-6 py-4">
              <div
                  class="mt-2 flex items-center justify-between text-sm tracking-tight text-main-400 dark:text-main-200">
                <div class="flex flex-wrap items-center">
                  <span class="pr-2" v-for="(genre, index) in media.data.genre.slice(0, 3)" :key="index">{{
                      genre
                    }}</span>
                </div>
              </div>
              <div class="flex w-full flex-col overflow-hidden rounded-lg md:flex-row">
                <div class="w-full space-y-2 text-left">
                  <p class="text-xl font-bold uppercase tracking-wide text-main-500 dark:text-light-400">
                    {{ media.data.title }}
                    ({{ media.data.year }})</p>

                  <div v-if="media.data.desc"
                       class="max-h-[15rem] overflow-y-auto scrollbar-thin scrollbar-track-light-300 scrollbar-thumb-main-500 scrollbar-track-rounded-xl scrollbar-thumb-rounded-xl">
                    <article class="pb-8 pr-8 text-main-500 dark:text-light-400">
                      <p v-html="media.data.desc" class="hyphens-auto text-base leading-relaxed"></p>
                    </article>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-span-full mr-4">
              <TBaseSwitch v-model="monitor" labelLeft="Monitor" class="flex"/>
            </div>
          </div>
        </div>
      </div>
      <div class="flex shrink-0 justify-end gap-4 p-4">
        <BaseButton @click="media.open = false" :rounded=true size="xs" variant="secondary">Cancel</BaseButton>
        <BaseButton type="submit" :rounded=true size="xs" variant="primary">Import Manga</BaseButton>
      </div>

    </form>
  </div>
</template>

<script>
import libraryAPI from '../api/library'
import { ref } from 'vue'
import BaseButton from '../components/base/TBaseButton.vue'

import {
  DialogTitle,
  Switch,
  SwitchGroup,
  SwitchLabel
} from '@headlessui/vue'
import TBaseIcon from '@/components/base/TBaseIcon.vue'
import { useNotificationStore } from '@/stores/notificationsStore.js'
import TBaseSwitch from '@/components/base/TBaseSwitch.vue'

export default {
  name: 'AddManga',
  // emits: ["do-close"],
  inheritAttrs: false,
  props: {
    media: {
      type: Object,
      required: true
    }
  },
  components: {
    TBaseSwitch,
    TBaseIcon,
    BaseButton,
    Switch,
    SwitchGroup,
    SwitchLabel,
    DialogTitle
  },
  setup (props) {
    const notificationsStore = useNotificationStore()
    const monitor = ref(false)

    const addMedia = (id) => {
      const body = {
        for: 'mangaImportQueue',
        options: {
          timeout: 1000 * 60 * 10 // 10 minutes
        },
        payload: {
          id: props.media.data.id,
          title: props.media.data.title,
          year: props.media.data.year,
          externalIds: props.media.data.externalIds,
          altTitles: props.media.data.altTitles,
          source: props.media.data.source,
          monitor: monitor.value
        },
        entityId: id
      }

      const result = libraryAPI.publishCommand(body)
      result.then((response) => {
        if (response.success) {
          notificationsStore.showNotification({
            title: 'New manga added',
            message: 'Teemii will now fetch this manga and add it to your collection.',
            type: 'success'
          })
          props.media.open = false
        } else {
          notificationsStore.showNotification({
            title: 'Error',
            message: response.message,
            type: 'error'
          })
        }
      }).catch((request) => {
        console.error('error', request)
      })
    }

    return {
      addMedia,
      monitor
    }
  }
}
</script>
