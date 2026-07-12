import Vue from 'vue'
import Vant from 'vant'
import 'vant/lib/index.css'

import App from './App.vue'
import router from './router'
import store from './store'
import { api, setUnauthorizedHandler } from './api/client'
import './styles/theme.css'

Vue.use(Vant)
Vue.config.productionTip = false
Vue.prototype.$api = api

setUnauthorizedHandler(async () => {
  await store.dispatch('auth/logout')
  if (router.currentRoute.path !== '/login') {
    await router.replace({ path: '/login', query: { redirect: router.currentRoute.fullPath } })
  }
})

new Vue({
  router,
  store,
  render: (h) => h(App),
}).$mount('#app')
