<template>
  <div class="pointer-events-auto w-screen max-w-md ">
    <form
        action="#"
        @submit.prevent="addMedia(media.data.id)"
        class="flex h-full flex-col divide-y divide-main-200 bg-main-50 shadow-xl"
    >
      <div class="h-0 flex-1 overflow-y-auto">
        <div :style="{ backgroundImage: `url(${media.data.cover})` }" class="overflow-hidden bg-cover bg-center bg-no-repeat sm:h-32 lg:h-32">
          <div class="absolute h-32 w-full bg-main-500 opacity-60"/>
          <div class="bg-main-600/30 px-4 py-6 bg-blend-normal backdrop-blur-md sm:px-6">
            <div class="flex items-center justify-between">
              <DialogTitle class="text-lg font-medium text-white">
                Add a new manga to your collection
              </DialogTitle>
              <div class="ml-3 flex h-7 items-center">
                <button type="button"
                    class="rounded-md bg-main-500 text-accent-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
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
            <div class="space-y-6 pb-5 pt-6">
              <div class="mt-2 flex items-center justify-between text-sm tracking-tight text-main-400">
                <div class="flex flex-wrap items-center">
                  <span class="pr-2" v-for="(genre, index) in media.data.genre.slice(0, 3)" :key="index">{{
                      genre
                    }}</span>
                </div>
              </div>
              <div class="flex w-full flex-col overflow-hidden rounded-lg md:flex-row">
                <div class="w-full space-y-2 text-left">
                  <p class="text-xl font-bold text-main-700">{{ media.data.title }}
                    ({{ media.data.year }})</p>
                  <div v-if="media.data.desc"
                       class="my-auto max-h-72 overflow-y-auto scrollbar-thin scrollbar-track-main-100 scrollbar-thumb-main-500">
                    <p class="pr-4 text-sm font-normal leading-relaxed text-main-500"
                       v-html="media.data.desc"></p>
                  </div>
                </div>
              </div>
            </div>

            <SwitchGroup
                as="div"
                class="flex items-center justify-between pb-6 pt-4"
            >
              <span class="flex grow flex-col">
                <SwitchLabel
                    as="span"
                    class="text-sm font-medium text-main-900"
                    passive
                >Monitor</SwitchLabel
                >
              </span>
              <Switch
                  v-model="monitor"
                  :class="[
                  monitor ? 'bg-accent-600' : 'bg-main-200',
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2',
                ]"
              >
                <span
                    :class="[
                    monitor ? 'translate-x-5' : 'translate-x-0',
                    'pointer-events-none relative inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  ]"
                >
                  <span
                      :class="[
                      monitor
                        ? 'opacity-0 duration-100 ease-out'
                        : 'opacity-100 duration-200 ease-in',
                      'absolute inset-0 flex h-full w-full items-center justify-center transition-opacity',
                    ]"
                      aria-hidden="true"
                  >
                    <svg
                        class="h-3 w-3 text-main-400"
                        fill="none"
                        viewBox="0 0 12 12"
                    >
                      <path
                          d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                      />
                    </svg>
                  </span>
                  <span
                      :class="[
                      monitor
                        ? 'opacity-100 duration-200 ease-in'
                        : 'opacity-0 duration-100 ease-out',
                      'absolute inset-0 flex h-full w-full items-center justify-center transition-opacity',
                    ]"
                      aria-hidden="true"
                  >
                    <svg
                        class="h-3 w-3 text-accent-600"
                        fill="currentColor"
                        viewBox="0 0 12 12"
                    >
                      <path
                          d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z"
                      />
                    </svg>
                  </span>
                </span>
              </Switch>
            </SwitchGroup>
          </div>
        </div>
      </div>
      <div class="flex shrink-0 justify-end gap-4 p-4">
        <BaseButton @click="media.open = false" :rounded=true size="xs" variant="secondary">Cancel</BaseButton>
        <BaseButton type="submit" :rounded=true size="xs" variant="primary">Add</BaseButton>
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
          source: props.media.data.source
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
