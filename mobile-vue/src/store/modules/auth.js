import { api } from '@/api/client'

const TOKEN_KEY = 'farmlink_token'
const USER_KEY = 'farmlink_user'

function readUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch (_) {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export default {
  namespaced: true,
  state: () => ({
    initialized: false,
    token: null,
    user: null,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
  },
  mutations: {
    initialize(state) {
      state.token = localStorage.getItem(TOKEN_KEY)
      state.user = readUser()
      state.initialized = true
    },
    setSession(state, session) {
      state.token = session.token
      state.user = session.user || null
    },
    clearSession(state) {
      state.token = null
      state.user = null
    },
  },
  actions: {
    initialize({ state, commit }) {
      if (!state.initialized) commit('initialize')
    },
    async login({ commit }, credentials) {
      const session = await api.post('/auth/login', credentials)
      localStorage.setItem(TOKEN_KEY, session.token)
      localStorage.setItem(USER_KEY, JSON.stringify(session.user || null))
      commit('setSession', session)
      return session
    },
    async register({ commit }, profile) {
      const session = await api.post('/auth/register', {
        ...profile,
        displayName: profile.displayName || profile.nickname,
      })
      localStorage.setItem(TOKEN_KEY, session.token)
      localStorage.setItem(USER_KEY, JSON.stringify(session.user || null))
      commit('setSession', session)
      return session
    },
    async logout({ commit }) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      commit('clearSession')
    },
  },
}
