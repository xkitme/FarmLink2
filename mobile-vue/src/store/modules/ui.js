// 轻量 UI 传参：通用详情页 /detail/info 的入参。
// Hash 路由无法通过 route 携带复杂对象，改由调用方在跳转前写入 store。
//
// 用法：
//   this.$store.commit('ui/setDetail', {
//     title: '标题', body: '正文',
//     sections: [{ subtitle, body, items: [] }],
//     image: 'https://...', actionLabel: '去处理', actionRoute: '/xxx',
//   })
//   this.$router.push({ name: 'detail-info' })

export default {
  namespaced: true,
  state: () => ({
    detail: null,
  }),
  mutations: {
    setDetail(state, payload) {
      state.detail = payload || null
    },
    clearDetail(state) {
      state.detail = null
    },
  },
}
