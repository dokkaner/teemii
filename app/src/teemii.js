import { createApp } from 'vue'
import i18next from 'i18next'
import I18NextVue from 'i18next-vue'
import App from './App.vue'
import './index.css'
import logger from './loaders/logger.js'
import router from './router'
import veProgress from 'vue-ellipse-progress'
import { defineGlobalComponents } from './globalComponents'
import { createPinia } from 'pinia'
import i18n from './scripts/i18n.js'
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faGithub, faXTwitter, faPatreon } from '@fortawesome/free-brands-svg-icons'
import { faLifeRing, faPaw } from '@fortawesome/free-solid-svg-icons'
import { faHeart } from '@fortawesome/free-regular-svg-icons'
import { useUserInterfaceStore } from './stores/userInterfaceStore.js'
// fontawesome
library.add(faGithub, faLifeRing, faHeart, faPaw, faXTwitter, faPatreon)

const pinia = createPinia()
const app = createApp(App)

app.name = 'Teemii'

app.config.errorHandler = (err) => {
  console.log(err)
}

app.config.warnHandler = (warn) => {
  console.warn(warn)
}

defineGlobalComponents(app)

app.use(pinia)
app.use(I18NextVue, { i18next })
app.use(logger)
app.use(router)
app.use(veProgress)
app.component('font-awesome-icon', FontAwesomeIcon)

const UserInterfaceStore = useUserInterfaceStore()
i18next.changeLanguage(UserInterfaceStore.userLanguage)
app.mount('#app')
