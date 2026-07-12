<template>
  <AppShell title="田园通" subtitle="智慧乡村服务平台" active="home">
    <template #header-right>
      <button class="header-button" type="button" aria-label="消息通知" @click="$router.push({ name: 'messages' })"><van-icon name="bell" size="21" /></button>
    </template>
    <van-pull-refresh v-model="refreshing" @refresh="load">
      <div class="home">
        <section class="hero">
          <div>
            <p class="hero__eyebrow">今日乡村服务</p>
            <h1>{{ greeting }}，{{ displayName }}</h1>
            <p>田间管理、惠农政策与市场服务，一站直达</p>
          </div>
          <div class="hero__weather">
            <van-icon name="sun-o" size="25" />
            <strong>{{ weather.temperature || '--' }}°</strong>
            <span>{{ weather.text || '天气服务' }}</span>
          </div>
        </section>

        <button class="search" type="button" @click="goRoute('/search')"><van-icon name="search" size="19" /><span>搜索政策、农技、服务</span><van-icon name="scan" size="19" /></button>

        <section class="panel">
          <div class="section-title"><div><small>常用入口</small><h2>乡村服务</h2></div><button type="button" @click="$router.push({ name: 'all' })">全部服务 <van-icon name="arrow" /></button></div>
          <div class="service-grid">
            <button v-for="item in services" :key="item.label" type="button" @click="goRoute(item.route)">
              <span class="service-icon" :style="{ color: item.color, backgroundColor: item.bg }"><van-icon :name="item.icon" size="23" /></span>
              <span>{{ item.label }}</span>
            </button>
          </div>
        </section>

        <section class="decision-card">
          <div class="decision-card__head"><span><van-icon name="bulb-o" /> 今日建议</span><em>智能服务</em></div>
          <h2>{{ recommendation.title }}</h2>
          <p>{{ recommendation.body }}</p>
          <button type="button" @click="goRoute(recommendation.route)">查看详情 <van-icon name="arrow" /></button>
        </section>

        <section class="panel">
          <div class="section-title"><div><small>平台动态</small><h2>乡村数字概览</h2></div></div>
          <div class="stats">
            <div><strong>{{ stats.farmerCount || 0 }}</strong><span>服务农户</span></div>
            <div><strong>{{ stats.totalAreaMu || 0 }}</strong><span>管理亩数</span></div>
            <div><strong>{{ stats.orderCount || 0 }}</strong><span>惠农订单</span></div>
          </div>
        </section>

        <section v-if="policy.title" class="news" @click="goRoute('/policy')">
          <span class="news__tag">惠农政策</span><div><h3>{{ policy.title }}</h3><p>{{ policy.summary || '查看最新政策详情与申报指南' }}</p></div><van-icon name="arrow" />
        </section>
      </div>
    </van-pull-refresh>
  </AppShell>
</template>

<script>
import AppShell from '../components/AppShell.vue'

function payload(response) {
  var value = response && Object.prototype.hasOwnProperty.call(response, 'data') ? response.data : response
  return value && Object.prototype.hasOwnProperty.call(value, 'data') ? value.data : (value || {})
}

export default {
  name: 'HomeView',
  components: { AppShell },
  data() {
    return {
      refreshing: false,
      weather: {}, stats: {}, policy: {},
      services: [
        { label: '农业生产', icon: 'flower-o', route: '/agri', color: '#386641', bg: '#e7f1e7' },
        { label: '乡村集市', icon: 'shop-o', route: '/market', color: '#9a6a24', bg: '#f8eddc' },
        { label: '农机共享', icon: 'logistics', route: '/machinery', color: '#2e6e66', bg: '#e2f0ee' },
        { label: '气象灾害', icon: 'warning-o', route: '/disaster', color: '#ba1a1a', bg: '#fbe7e5' },
        { label: '惠农政策', icon: 'balance-list-o', route: '/policy', color: '#3e6b4f', bg: '#e6efe8' },
        { label: '乡村生活', icon: 'wap-home-o', route: '/life', color: '#734e00', bg: '#f6ead5' },
        { label: '数据看板', icon: 'bar-chart-o', route: '/data', color: '#526258', bg: '#e9ece9' },
        { label: 'AI 助手', icon: 'chat-o', route: '/ai', color: '#2d6a4f', bg: '#e1f2e9' }
      ]
    }
  },
  computed: {
    user() { return (this.$store.state.auth && this.$store.state.auth.user) || {} },
    displayName() { return this.user.nickname || this.user.username || '农友' },
    greeting() { var hour = new Date().getHours(); return hour < 11 ? '早上好' : (hour < 14 ? '中午好' : (hour < 18 ? '下午好' : '晚上好')) },
    recommendation() {
      var alerts = this.weather.alerts || []
      if (alerts.length) return { title: alerts[0].title || '气象预警提醒', body: alerts[0].content || '请及时关注天气变化，做好田间防护。', route: '/disaster' }
      return { title: '查看今日农事安排', body: '结合天气与作物生长阶段，合理安排灌溉、施肥和巡田。', route: '/agri' }
    }
  },
  created() { this.load() },
  methods: {
    async load() {
      try {
        var results = await Promise.allSettled([this.$api.get('/agri/weather'), this.$api.get('/data/dashboard'), this.$api.get('/policy/list', { page: 1, pageSize: 1 })])
        if (results[0].status === 'fulfilled') {
          var weatherData = payload(results[0].value); var today = (weatherData.days && weatherData.days[0]) || weatherData
          this.weather = Object.assign({}, today, { alerts: weatherData.alerts || [] })
        }
        if (results[1].status === 'fulfilled') { var dashboard = payload(results[1].value); this.stats = dashboard.platformStats || {} }
        if (results[2].status === 'fulfilled') { var list = payload(results[2].value); this.policy = (list.list || list.items || [])[0] || {} }
      } finally { this.refreshing = false }
    },
    goRoute(path) { if (path === '/all') this.$router.push({ name: 'all' }); else this.$router.push(path) }
  }
}
</script>

<style scoped>
.header-button { display:grid; width:36px; height:36px; padding:0; color:#386641; background:#edf4ee; border:0; border-radius:50%; place-items:center; }.home { max-width:600px; margin:auto; padding:14px 14px 26px; }.hero { display:flex; min-height:132px; padding:22px 20px; color:#fff; background:linear-gradient(135deg,#3e6b4f,#5c8a6d); border-radius:24px; box-shadow:0 12px 28px rgba(62,107,79,.2); box-sizing:border-box; justify-content:space-between; }.hero__eyebrow { margin:0 0 7px; color:#d8f3dc; font-size:11px; font-weight:800; letter-spacing:1px; }.hero h1 { margin:0; font-size:22px; }.hero p:last-child { max-width:220px; margin:9px 0 0; color:rgba(255,255,255,.78); font-size:12px; line-height:1.55; }.hero__weather { display:flex; min-width:74px; flex-direction:column; align-items:center; justify-content:center; }.hero__weather strong { margin-top:2px; font-size:25px; }.hero__weather span { color:rgba(255,255,255,.74); font-size:10px; }.search { display:flex; width:calc(100% - 26px); height:46px; margin:-16px auto 15px; padding:0 16px; color:#827966; background:#fff; border:1px solid #ebe5d5; border-radius:999px; box-shadow:0 7px 20px rgba(74,65,49,.1); align-items:center; gap:10px; }.search span { flex:1; text-align:left; }.panel { margin-top:14px; padding:17px 15px; background:#fff; border:1px solid #e5dfce; border-radius:18px; box-shadow:0 5px 20px rgba(121,85,72,.05); }.section-title { display:flex; align-items:flex-end; justify-content:space-between; }.section-title small { color:#8d816b; font-size:10px; }.section-title h2 { margin:2px 0 0; font-size:17px; }.section-title button { padding:5px 0; color:#52745b; background:none; border:0; font-size:12px; }.service-grid { display:grid; margin-top:16px; grid-template-columns:repeat(4,1fr); row-gap:17px; }.service-grid button { display:flex; min-width:0; padding:0; color:#4e554c; background:none; border:0; flex-direction:column; align-items:center; gap:7px; font-size:11px; }.service-icon { display:grid; width:45px; height:45px; border-radius:14px; place-items:center; }.decision-card { position:relative; margin-top:14px; overflow:hidden; padding:17px 18px; background:linear-gradient(145deg,#fffaf0,#fff); border:1px solid #e7c684; border-radius:18px; }.decision-card::after { position:absolute; right:-22px; bottom:-32px; width:100px; height:100px; content:''; background:rgba(221,161,94,.12); border-radius:50%; }.decision-card__head { display:flex; color:#8a5b17; font-size:12px; font-weight:800; justify-content:space-between; }.decision-card__head em { padding:3px 8px; color:#386641; background:#e7f1e7; border-radius:999px; font-size:10px; font-style:normal; }.decision-card h2 { margin:12px 0 5px; font-size:17px; }.decision-card p { margin:0; color:#726a57; font-size:12px; line-height:1.55; }.decision-card button { margin-top:10px; padding:0; color:#386641; background:none; border:0; font-size:12px; font-weight:800; }.stats { display:grid; margin-top:15px; grid-template-columns:repeat(3,1fr); }.stats div { display:flex; flex-direction:column; text-align:center; border-right:1px solid #eee8d9; }.stats div:last-child { border:0; }.stats strong { color:#386641; font-size:21px; }.stats span { margin-top:3px; color:#827966; font-size:11px; }.news { display:grid; margin-top:14px; padding:14px; background:#fff; border:1px solid #e5dfce; border-radius:17px; grid-template-columns:auto 1fr auto; align-items:center; gap:10px; }.news__tag { padding:5px 7px; color:#fff; background:#386641; border-radius:8px; font-size:10px; }.news h3 { margin:0; overflow:hidden; font-size:13px; text-overflow:ellipsis; white-space:nowrap; }.news p { margin:4px 0 0; overflow:hidden; color:#827966; font-size:11px; text-overflow:ellipsis; white-space:nowrap; }
</style>
