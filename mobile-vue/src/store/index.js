import Vue from 'vue'
import Vuex from 'vuex'
import auth from './modules/auth'
import ui from './modules/ui'
import notification from './modules/notification'

Vue.use(Vuex)

export default new Vuex.Store({
  strict: import.meta.env.DEV,
  modules: {
    auth,
    ui,
    notification,
  },
})
