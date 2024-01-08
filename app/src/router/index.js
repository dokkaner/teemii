import { createWebHistory, createRouter } from 'vue-router'
import Home from '../views/home.vue'
import Search from '../views/search.vue'
import Mangas from '../views/mangas.vue'
import Manga from '../views/manga.vue'
import Chapter from '../views/chapter.vue'
import ActivityView from '../views/activity.vue'
import settingsView from '../views/settingsView.vue'
import loginView from '../views/login.vue'
import IntegrationView from '../views/integration.vue'
import Wizard from '../views/setup/wizard.vue'
import NotFound from '@/views/NotFound.vue'
import { backendSys } from '@/global.js'
import apiLibrary from './../api/library.js'
import { useAuthStore } from '@/stores/authStore.js'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/search/:q?',
    name: 'Search',
    component: Search
  },
  {
    path: '/mangas',
    name: 'Mangas',
    component: Mangas
  },
  {
    path: '/mangas/:id/:page',
    component: Manga,
    name: 'Manga',
    props: true
  },
  {
    path: '/activity/:tab?',
    component: ActivityView,
    name: 'Activity',
    props: true
  },
  {
    path: '/chapters/:id/:page',
    component: Chapter,
    name: 'Chapter',
    props: true,
    meta: { layout: 'empty' }
  },
  {
    path: '/wizard',
    component: Wizard,
    name: 'Wizard',
    props: true,
    meta: { layout: 'empty' }
  },
  {
    path: '/settings',
    component: settingsView,
    name: 'settingsView',
    props: true
  },
  {
    path: '/login',
    component: loginView,
    name: 'login',
    meta: { layout: 'empty' },
    props: true
  },
  {
    path: '/integration',
    component: IntegrationView,
    name: 'Sync',
    props: true
  },
  {
    path: '/:pathMatch(.*)*',
    component: NotFound,
    name: 'NotFound',
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

/**
 * Handles global navigation based on system status and user authentication.
 * This function is called before every route change.
 */
router.beforeEach(async (to, from, next) => {
  try {
    // only if not /wizard
    if (to.path !== '/wizard') {
      // Handle system status check
      if (!await checkAndHandleSystemStatus(to, next)) return

      // Handle user authentication and redirection if necessary
      if (!await checkAndHandleUserAuthentication(to, next)) return
    }

    // Proceed with the navigation if all checks pass
    next()
  } catch (error) {
    console.error('Error during route resolution:', error)
    next()
  }
})

/**
 * Checks and handles the system status. Redirects to set up wizard if needed.
 * @param {Object} to - The target route object.
 * @param {Function} next - The next method to resolve the navigation.
 * @returns {Promise<boolean>} - Returns true if the navigation should proceed.
 */
async function checkAndHandleSystemStatus (to, next) {
  const systemStatusResponse = await apiLibrary.getSystemStatus()

  if (systemStatusResponse.success) {
    backendSys.value = systemStatusResponse.body
    if (!systemStatusResponse.body.setupCompleted && to.path !== '/wizard') {
      next('/wizard')
      return false
    }
  } else {
    console.error('Failed to get system status:', systemStatusResponse.statusText)
    if (systemStatusResponse.status !== 500 && systemStatusResponse.status !== 429) {
      next('/wizard')
      return false
    }
  }

  return true
}

/**
 * Checks and handles user authentication. Redirects to log in if needed.
 * @param {Object} to - The target route object.
 * @param {Function} next - The next method to resolve the navigation.
 * @returns {Promise<boolean>} - Returns true if the navigation should proceed.
 */
async function checkAndHandleUserAuthentication (to, next) {
  if (to.path !== '/login') {
    const userPrefResponse = await apiLibrary.getUserPreferences()

    if (userPrefResponse.success) {
      const preferences = userPrefResponse.body?.body?.preferences || {}
      const securityEnabled = preferences?.security?.enable
      const isLoggedIn = useAuthStore().isLoggedIn

      if (securityEnabled && !isLoggedIn) {
        next('/login')
        return false
      }
    } else if (userPrefResponse.code === 401 || userPrefResponse.code === 403) {
      // force logout if user is not authenticated
      next('/login')
      return false
    }
  }

  return true
}

export default router
