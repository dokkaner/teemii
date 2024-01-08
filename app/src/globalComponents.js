import { defineAsyncComponent } from 'vue'
import EmptyLayout from './components/EmptyLayout.vue'
import DefaultLayout from './components/DefaultLayout.vue'

export const defineGlobalComponents = (app) => {
  const components = import.meta.glob('./components/base/*.vue', { eager: true })

  Object.entries(components).forEach(([path, definition]) => {
    const componentName = path
      .split('/')
      .pop()
      .replace(/\.\w+$/, '')

    // Register component on this Vue instance
    console.log(`Registering ${componentName}`)
    app.component(componentName, definition.default)
  })

  const BaseMultiselect = defineAsyncComponent(() =>
    import('./components/base-select/BaseMultiselect.vue')
  )

  const TBaseTable = defineAsyncComponent(() =>
    import('./components/base-table/BaseTable.vue')
  )

  app.component('default-layout', DefaultLayout)
  app.component('empty-layout', EmptyLayout)
  app.component('BaseMultiselect', BaseMultiselect)
}
