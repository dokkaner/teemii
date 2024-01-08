import { createApp } from 'vue'
import App from './App.vue'
import './index.css'
import logger from './loaders/logger.js'
import router from './router'
import veProgress from 'vue-ellipse-progress'
import { defineGlobalComponents } from './globalComponents'
import { createPinia } from 'pinia'
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faGithub, faXTwitter } from '@fortawesome/free-brands-svg-icons'
import { faLifeRing, faPaw } from '@fortawesome/free-solid-svg-icons'
import { faHeart } from '@fortawesome/free-regular-svg-icons'

// fontawesome
library.add(faGithub, faLifeRing, faHeart, faPaw, faXTwitter)

const app = createApp(App)
app.name = 'Teemii'

app.config.errorHandler = (err) => {
  console.log(err)
}

app.config.warnHandler = (warn) => {
  console.warn(warn)
}

defineGlobalComponents(app)
const pinia = createPinia()

app.use(logger)
app.use(router)
app.use(veProgress)
app.use(pinia)
app.component('font-awesome-icon', FontAwesomeIcon)
app.mount('#app')
