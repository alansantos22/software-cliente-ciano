import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import i18n from './i18n'
import App from './App.vue'

// Font Awesome
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faGauge, faSitemap, faCoins, faCartShopping, faCrown,
  faCreditCard, faChartLine, faBell, faUser, faGear,
  faRightFromBracket, faChevronLeft, faChevronRight, faChevronDown,
  faBars, faDollarSign, faUsers, faGlobe, faTrophy, faRotate,
  faStar, faGem, faMedal, faHandshake, faCheck, faArrowRight,
  faEye, faCalendarDays, faMoneyBillWave, faNetworkWired,
  faCircleInfo, faShieldHalved, faArrowTrendUp, faArrowTrendDown,
  faWallet, faClipboardList, faXmark, faEllipsisVertical,
  faClockRotateLeft,
  // Network screen additions
  faUserPlus, faBolt, faCircleCheck, faCircleXmark, faClock,
  faPhone, faChevronUp,
  // Dashboard additions
  faTriangleExclamation, faCalendarDay,
} from '@fortawesome/free-solid-svg-icons'

library.add(
  faGauge, faSitemap, faCoins, faCartShopping, faCrown,
  faCreditCard, faChartLine, faBell, faUser, faGear,
  faRightFromBracket, faChevronLeft, faChevronRight, faChevronDown,
  faBars, faDollarSign, faUsers, faGlobe, faTrophy, faRotate,
  faStar, faGem, faMedal, faHandshake, faCheck, faArrowRight,
  faEye, faCalendarDays, faMoneyBillWave, faNetworkWired,
  faCircleInfo, faShieldHalved, faArrowTrendUp, faArrowTrendDown,
  faWallet, faClipboardList, faXmark, faEllipsisVertical,
  faClockRotateLeft,
  // Network screen additions
  faUserPlus, faBolt, faCircleCheck, faCircleXmark, faClock,
  faPhone, faChevronUp,
  // Dashboard additions
  faTriangleExclamation, faCalendarDay,
)

// Styles
import './assets/scss/main.scss'

const app = createApp(App)

// Plugins
app.use(createPinia())
app.use(router)
app.use(i18n)
app.component('font-awesome-icon', FontAwesomeIcon)

// Mount
app.mount('#app')
