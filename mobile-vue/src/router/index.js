import Vue from 'vue'
import VueRouter from 'vue-router'
import store from '@/store'
import PlaceholderView from '@/views/PlaceholderView.vue'
import LaunchView from '@/views/LaunchView.vue'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import ForgotPasswordView from '@/views/ForgotPasswordView.vue'
import HomeView from '@/views/HomeView.vue'
import AllFeaturesView from '@/views/AllFeaturesView.vue'
import ProfileView from '@/views/ProfileView.vue'

// P1 新增只读页：按需拆包，避免拖大首屏 bundle。
const SearchView = () => import('@/views/SearchView.vue')
const InfoDetailView = () => import('@/views/InfoDetailView.vue')
const SettingsHomeView = () => import('@/views/settings/SettingsHomeView.vue')
const AboutView = () => import('@/views/settings/AboutView.vue')
const LegalView = () => import('@/views/settings/LegalView.vue')
const HelpView = () => import('@/views/settings/HelpView.vue')
// P2 读多写少页
const MessagesView = () => import('@/views/MessagesView.vue')
const PolicyView = () => import('@/views/PolicyView.vue')
const PolicyDetailView = () => import('@/views/PolicyDetailView.vue')
const DataDashboardView = () => import('@/views/DataDashboardView.vue')
const MarketView = () => import('@/views/MarketView.vue')
const ProductDetailView = () => import('@/views/ProductDetailView.vue')
const OrdersView = () => import('@/views/OrdersView.vue')
const IotView = () => import('@/views/IotView.vue')
const AiThreadsView = () => import('@/views/AiThreadsView.vue')
const AiThreadDetailView = () => import('@/views/AiThreadDetailView.vue')
const VillageScreenView = () => import('@/views/VillageScreenView.vue')

Vue.use(VueRouter)

// 迁移占位工厂：写型 / 后续批次页面统一落到占位，不 404、不 no-op。
function migrating(title) {
  return {
    component: PlaceholderView,
    meta: {
      requiresAuth: true,
      title,
      description: '该功能将在后续 P 批次接入，当前 Flutter 版本仍可正常使用。',
    },
  }
}

const router = new VueRouter({
  // APK 内没有可接管 history fallback 的 Web 服务器，统一使用 Hash 路由。
  mode: 'hash',
  routes: [
    // 启动广告 / 引导入口：自身决定去首页或登录，不挂 requiresAuth。
    {
      path: '/launch',
      name: 'launch',
      component: LaunchView,
      meta: { public: true, title: '田园通' },
    },
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
    { path: '/', redirect: '/launch' },
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
      path: '/search',
      name: 'search',
      component: SearchView,
      meta: { requiresAuth: true, title: '搜索' },
    },
    {
      path: '/detail/info',
      name: 'detail-info',
      component: InfoDetailView,
      meta: { requiresAuth: true, title: '详情' },
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
      component: MessagesView,
      meta: { requiresAuth: true, title: '消息' },
    },
    {
      path: '/policy',
      name: 'policy',
      component: PolicyView,
      meta: { requiresAuth: true, title: '惠农政策' },
    },
    {
      path: '/policy/:id',
      name: 'policy-detail',
      component: PolicyDetailView,
      meta: { requiresAuth: true, title: '政策详情' },
    },
    {
      path: '/data',
      name: 'data',
      component: DataDashboardView,
      meta: { requiresAuth: true, title: '数据看板' },
    },
    {
      path: '/market',
      name: 'market',
      component: MarketView,
      meta: { requiresAuth: true, title: '乡村集市' },
    },
    {
      path: '/market/orders',
      name: 'market-orders',
      component: OrdersView,
      meta: { requiresAuth: true, title: '我的订单' },
    },
    {
      path: '/market/product/:id',
      name: 'product-detail',
      component: ProductDetailView,
      meta: { requiresAuth: true, title: '商品详情' },
    },
    {
      path: '/data/screen',
      name: 'village-screen',
      component: VillageScreenView,
      meta: { requiresAuth: true, title: '村级大屏' },
    },
    {
      path: '/iot',
      name: 'iot',
      component: IotView,
      meta: { requiresAuth: true, title: '智能物联' },
    },
    {
      path: '/ai',
      name: 'ai',
      component: AiThreadsView,
      meta: { requiresAuth: true, title: 'AI 助手' },
    },
    {
      path: '/ai/thread/:id',
      name: 'ai-thread',
      component: AiThreadDetailView,
      meta: { requiresAuth: true, title: '对话详情' },
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      meta: { requiresAuth: true, title: '我的' },
    },
    // 设置中心与只读子页
    {
      path: '/profile/settings',
      name: 'settings',
      component: SettingsHomeView,
      meta: { requiresAuth: true, title: '设置' },
    },
    {
      path: '/profile/settings/about',
      name: 'settings-about',
      component: AboutView,
      meta: { requiresAuth: true, title: '关于田园通' },
    },
    {
      path: '/profile/settings/agreement',
      name: 'settings-agreement',
      component: LegalView,
      meta: { requiresAuth: true, title: '服务协议', doc: 'service' },
    },
    {
      path: '/profile/settings/privacy',
      name: 'settings-privacy',
      component: LegalView,
      meta: { requiresAuth: true, title: '隐私政策', doc: 'privacy' },
    },
    {
      path: '/profile/settings/help',
      name: 'settings-help',
      component: HelpView,
      meta: { requiresAuth: true, title: '帮助与反馈' },
    },
    // 写型 / 后续批次设置子页：先落占位，避免死链。
    { path: '/profile/settings/account', name: 'settings-account', ...migrating('个人资料') },
    { path: '/profile/settings/password', name: 'settings-password', ...migrating('修改密码') },
    { path: '/profile/settings/push', name: 'settings-push', ...migrating('消息推送设置') },
    { path: '/profile/settings/weather', name: 'settings-weather', ...migrating('气象预警提醒') },
    { path: '/profile/settings/storage', name: 'settings-storage', ...migrating('存储空间管理') },
    { path: '/profile/settings/elder', name: 'settings-elder', ...migrating('适老模式') },
    { path: '/profile/settings/wake', name: 'settings-wake', ...migrating('语音唤醒') },
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
