import Vue from 'vue'
import VueRouter from 'vue-router'
import store from '@/store'
import PlaceholderView from '@/views/PlaceholderView.vue'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import ForgotPasswordView from '@/views/ForgotPasswordView.vue'
import HomeView from '@/views/HomeView.vue'
import AllFeaturesView from '@/views/AllFeaturesView.vue'
import ProfileView from '@/views/ProfileView.vue'

Vue.use(VueRouter)

const router = new VueRouter({
  // APK 内没有可接管 history fallback 的 Web 服务器，统一使用 Hash 路由。
  mode: 'hash',
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { public: true, title: '登录' },
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
      meta: { public: true, title: '注册' },
    },
    {
      path: '/forgot',
      name: 'forgot',
      component: ForgotPasswordView,
      meta: { public: true, title: '找回密码' },
    },
    { path: '/', redirect: '/home' },
    {
      path: '/home',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true, title: '田园通' },
    },
    {
      path: '/all',
      name: 'all',
      component: AllFeaturesView,
      meta: { requiresAuth: true, title: '全部服务' },
    },
    {
      path: '/publish',
      name: 'publish',
      component: PlaceholderView,
      meta: { requiresAuth: true, title: '发布' },
    },
    {
      path: '/messages',
      name: 'messages',
      component: PlaceholderView,
      meta: { requiresAuth: true, title: '消息' },
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: { requiresAuth: true, title: '我的' },
    },
    {
      path: '/migration/:feature',
      name: 'migration-placeholder',
      component: PlaceholderView,
      meta: { requiresAuth: true, title: '功能迁移中', description: '该业务将在后续 P 批次接入，当前 Flutter 版本仍可正常使用。' },
    },
    { path: '*', redirect: '/migration/pending' },
  ],
  scrollBehavior: () => ({ x: 0, y: 0 }),
})

router.beforeEach(async (to, from, next) => {
  await store.dispatch('auth/initialize')
  const isAuthenticated = store.getters['auth/isAuthenticated']

  if (to.matched.some((record) => record.meta.requiresAuth) && !isAuthenticated) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }
  if (to.path === '/login' && isAuthenticated) {
    next(typeof to.query.redirect === 'string' ? to.query.redirect : '/home')
    return
  }
  next()
})

router.afterEach((to) => {
  document.title = `${to.meta.title || '田园通'} · FarmLink`
})

export default router
