<template>
  <div class="flex min-h-screen items-center justify-center bg-main-50 px-4 py-12 dark:bg-darkMain-800 sm:px-6 lg:px-8">
    <div class="w-full max-w-md space-y-8">
      <div>
        <img class="mx-auto h-12 w-auto" src="/assets/icons/logo.png" alt="Teemii"/>
        <h2 class="mt-6 text-2xl font-medium tracking-tight text-main-500 dark:text-light-400 sm:text-4xl">
          {{ t('login.welcome_title') }}
        </h2>
        <div class="mt-0.5 flex items-center pt-4 font-medium text-main-400 dark:text-light-500">
          {{ t('login.welcome_subtitle') }}
        </div>
      </div>

      <form class="mt-8 space-y-6" @submit.prevent="validateBeforeSubmit">
        <input type="hidden" name="remember" value="true"/>
        <div class="-space-y-px rounded-md shadow-sm">
          <div>
            <label for="email-address" class="sr-only">username</label>
            <input
                id="email-address"
                name="login"
                type="text"
                autocomplete="login"
                required=""
                class="relative block w-full appearance-none rounded-none rounded-t-md border border-main-300 px-3 py-2 text-main-900 placeholder:text-main-500 focus:z-10 focus:border-accent-500 focus:outline-none focus:ring-main-500 sm:text-sm"
                :placeholder="t('general.username')"
                v-model="loginData.login"
            />
          </div>
          <div>
            <label for="password" class="sr-only">Password</label>
            <div class="relative flex">
              <input
                  id="password"
                  name="password"
                  :type="getInputType"
                  autocomplete="current-password"
                  required=""
                  class="w-full rounded-none rounded-b-md border border-main-300 px-3 py-2 pe-12 text-main-900 placeholder:text-main-500 focus:z-10 focus:border-accent-500 focus:outline-none focus:ring-main-500 sm:text-sm"
                  :placeholder="t('general.password')"
                  v-model="loginData.password"
              />
              <span class="absolute inset-y-0 end-0 z-10 grid place-content-center px-4"
                    @click="isShowPassword = !isShowPassword">
                <TBaseIcon v-if="isShowPassword" name="EyeSlashIcon"/>
                <TBaseIcon v-else name="EyeIcon"/>
              </span>
            </div>
          </div>
        </div>

        <div v-show="!valid" class="rounded-md bg-red-50 p-4">
          <div class="flex">
            <div class="shrink-0">
              <XCircleIcon class="h-5 w-5 text-red-400" aria-hidden="true"/>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-red-800">{{ errMsg }}</p>
            </div>
            <div class="ml-auto pl-3">
              <div class="-m-1.5">
                <button type="button"
                        @click="valid = true"
                        class="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50">
                  <span class="sr-only">Dismiss</span>
                  <XMarkIcon class="h-5 w-5" aria-hidden="true"/>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <button type="submit" class="group relative flex w-full justify-center rounded-md border border-transparent
            bg-main-600 px-4 py-2 text-sm font-medium text-white hover:bg-main-700 focus:outline-none focus:ring-2
            focus:ring-main-500 focus:ring-offset-2 dark:bg-darkAccent-600 dark:hover:bg-darkAccent-700
            dark:focus:ring-darkAccent-400">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3">
              <LockClosedIcon class="h-5 w-5 text-main-500 group-hover:text-main-400 dark:text-light-500"
                              aria-hidden="true"/>
            </span>
            {{ t('login.sign_in') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTranslation } from 'i18next-vue'
import { XCircleIcon, XMarkIcon, LockClosedIcon } from '@heroicons/vue/24/solid'
import { useAuthStore } from '@/stores/authStore.js'

defineOptions({
  name: 'loginView',
  inheritAttrs: false,
  customOptions: {}
})
const { t } = useTranslation()
const isLoading = ref(false)
const isShowPassword = ref(false)
const authStore = useAuthStore()

const loginData = ref({
  login: '',
  password: ''
})
const router = useRouter()
const valid = ref(true)
const errMsg = ref('')

async function validateBeforeSubmit () {
  isLoading.value = true

  try {
    await authStore.login(loginData.value.login, loginData.value.password)

    await router.push({ name: 'Home' })
  } catch (error) {
    valid.value = false
    errMsg.value = error
  } finally {
    isLoading.value = false
  }
}

const getInputType = computed(() => {
  return isShowPassword.value ? 'text' : 'password'
})
</script>
