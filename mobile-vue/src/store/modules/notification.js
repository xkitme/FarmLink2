// 消息未读计数：底栏「消息」红点与消息页共享。
import { api } from '@/api/client'

export default {
  namespaced: true,
  state: () => ({ unread: 0 }),
  mutations: {
    setUnread(state, n) {
      state.unread = Number(n) || 0
    },
  },
  actions: {
    async refresh({ commit }) {
      try {
        const data = await api.get('/notification/unread')
        const value = data && data.data !== undefined ? data.data : data
        commit('setUnread', (value && value.unread) || 0)
      } catch (_) {
        /* 未登录 / 网络异常时静默 */
      }
    },
  },
}
