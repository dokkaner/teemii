import TButton from './components/TButton.vue'
import TCard from './components/TCard.vue'
import TInput from './components/TInput.vue'
import TSelect from './components/TSelect.vue'
import TTextarea from './components/TTextarea.vue'
import TCheckbox from './components/TCheckbox.vue'
import TRadio from './components/TRadio.vue'
import TSwitch from './components/TSwitch.vue'
import TAlert from './components/TAlert.vue'
import TBadge from './components/TBadge.vue'
import TModal from './components/TModal.vue'
import TTooltip from './components/TTooltip.vue'
import TDropdown from './components/TDropdown.vue'
import TTable from './components/TTable.vue'
import TPagination from './components/TPagination.vue'
import TSpinner from './components/TSpinner.vue'
import TIcon from './components/TIcon.vue'
import TAvatar from './components/TAvatar.vue'
import TProgress from './components/TProgress.vue'

export default {
  install (app) {
    app.component('TButton', TButton)
    app.component('TCard', TCard)
    app.component('TInput', TInput)
    app.component('TSelect', TSelect)
    app.component('TTextarea', TTextarea)
    app.component('TCheckbox', TCheckbox)
    app.component('TRadio', TRadio)
    app.component('TSwitch', TSwitch)
    app.component('TAlert', TAlert)
    app.component('TBadge', TBadge)
    app.component('TModal', TModal)
    app.component('TTooltip', TTooltip)
    app.component('TDropdown', TDropdown)
    app.component('TTable', TTable)
    app.component('TPagination', TPagination)
    app.component('TSpinner', TSpinner)
    app.component('TIcon', TIcon)
    app.component('TAvatar', TAvatar)
    app.component('TProgress', TProgress)
  }
}
