<template>
  <AppShell title="我的" active="profile">
    <template #header-right><button class="header-button" type="button" @click="go('/profile/settings')"><van-icon name="setting-o" size="21" /></button></template>
    <div class="profile">
      <section class="profile-hero" @click="go('/profile/settings/account')">
        <van-image round width="66" height="66" :src="user.avatarUrl"><template #error><div class="avatar-fallback">{{ initial }}</div></template><template #loading><div class="avatar-fallback">{{ initial }}</div></template></van-image>
        <div class="profile-hero__info"><h1>{{ name }}</h1><p><span>Lv.{{ level }} · 成长农户</span><span>{{ roleLabel }}</span></p></div><van-icon name="arrow" />
      </section>
      <section class="stats"><button v-for="item in overview" :key="item.label" type="button" @click="go(item.route)"><strong>{{ item.value }}</strong><span>{{ item.label }}</span></button></section>
      <section class="card"><div class="card-title"><h2>我的订单</h2><button type="button" @click="go('/market/orders')">查看全部 <van-icon name="arrow" /></button></div><div class="actions actions--five"><button v-for="item in orders" :key="item.label" type="button" class="action" @click="go(item.route)"><span><van-icon :name="item.icon" size="21" /></span><em>{{ item.label }}</em></button></div></section>
      <section class="card"><div class="card-title"><h2>更多服务</h2></div><div class="actions"><button v-for="item in services" :key="item.label" type="button" class="action" @click="go(item.route)"><span><van-icon :name="item.icon" size="21" /></span><em>{{ item.label }}</em></button></div></section>
      <van-button plain round block color="#386641" class="logout" :loading="loggingOut" @click="logout">退出登录</van-button>
    </div>
  </AppShell>
</template>

<script>
import AppShell from '../components/AppShell.vue'

function payload(response) { var v = response && response.data !== undefined ? response.data : response; return v && v.data !== undefined ? v.data : (v || {}) }
export default {
  name: 'ProfileView', components: { AppShell },
  data: () => ({ dashboard: {}, loggingOut: false,
    orders: [{ label:'待付款',icon:'balance-pay',route:'/market/orders'},{ label:'待发货',icon:'gift-o',route:'/market/orders'},{ label:'待收货',icon:'logistics',route:'/market/orders'},{ label:'已完成',icon:'passed',route:'/market/orders'},{ label:'售后',icon:'service-o',route:'/market/orders'}],
    services: [{ label:'个人资料',icon:'contact',route:'/profile/settings/account'},{ label:'农事记录',icon:'records',route:'/agri'},{ label:'政策申请',icon:'description',route:'/policy/service'},{ label:'数据看板',icon:'bar-chart-o',route:'/data'},{ label:'消息通知',icon:'bell',route:'/messages'},{ label:'天气提醒',icon:'underway-o',route:'/profile/settings/weather'},{ label:'帮助反馈',icon:'comment-o',route:'/profile/settings/help'},{ label:'设置',icon:'setting-o',route:'/profile/settings'}]
  }),
  computed: {
    user() { return (this.$store.state.auth && this.$store.state.auth.user) || {} }, name() { return this.user.nickname || this.user.username || '田园通用户' }, initial() { return this.name.slice(0,1) }, level() { return this.user.level || 1 },
    roleLabel() { return ({FARMER:'普通农户',BIGFARMER:'种植大户',VILLAGE:'村委干部',EXPERT:'农技员',MERCHANT:'收购商',ADMIN:'管理员'})[this.user.role] || '农户' },
    overview() { var c=this.dashboard.cards || {}; return [{label:'地块',value:c.plotCount||0,route:'/agri'},{label:'农事',value:c.recordCount||0,route:'/agri'},{label:'订单',value:c.orderCount||0,route:'/market/orders'},{label:'AI',value:c.aiCallCount||0,route:'/ai'}] }
  },
  created() { this.load() },
  methods: {
    async load() { try { var r=await this.$api.get('/data/dashboard'); this.dashboard=payload(r) } catch (_) {} }, go(route) { this.$router.push(route) },
    async logout() { this.loggingOut=true; try { await this.$store.dispatch('auth/logout'); await this.$router.replace({name:'login'}) } finally { this.loggingOut=false } }
  }
}
</script>

<style scoped>
.header-button { display:grid; width:36px; height:36px; padding:0; color:#386641; background:#edf4ee; border:0; border-radius:50%; place-items:center; }.profile { max-width:600px; margin:auto; padding:14px; }.profile-hero { display:flex; min-height:132px; padding:22px 19px; color:#fff; background:linear-gradient(135deg,#305f43,#6e9577); border-radius:24px; box-shadow:0 12px 28px rgba(62,107,79,.2); align-items:center; gap:14px; box-sizing:border-box; }.avatar-fallback { display:grid; width:66px; height:66px; color:#386641; background:#e3f0e6; place-items:center; font-size:24px; font-weight:800; }.profile-hero__info { flex:1; min-width:0; }.profile-hero h1 { margin:0; overflow:hidden; font-size:22px; text-overflow:ellipsis; white-space:nowrap; }.profile-hero p { display:flex; margin:9px 0 0; gap:6px; flex-wrap:wrap; }.profile-hero p span { padding:4px 8px; color:rgba(255,255,255,.9); background:rgba(0,0,0,.16); border-radius:8px; font-size:10px; }.stats { display:grid; margin:-17px 13px 14px; position:relative; background:#fff; border:1px solid #e5dfce; border-radius:17px; box-shadow:0 8px 20px rgba(74,65,49,.1); grid-template-columns:repeat(4,1fr); }.stats button { display:flex; padding:14px 3px; background:none; border:0; flex-direction:column; align-items:center; }.stats strong { color:#386641; font-size:20px; }.stats span { margin-top:3px; color:#827966; font-size:11px; }.card { margin-top:13px; padding:16px 13px; background:#fff; border:1px solid #e5dfce; border-radius:18px; }.card-title { display:flex; align-items:center; justify-content:space-between; }.card-title h2 { margin:0; font-size:16px; }.card-title button { padding:0; color:#827966; background:none; border:0; font-size:11px; }.actions { display:grid; margin-top:16px; grid-template-columns:repeat(4,1fr); row-gap:17px; }.actions--five { grid-template-columns:repeat(5,1fr); }.action { display:flex; min-width:0; padding:0; background:none; border:0; flex-direction:column; align-items:center; gap:7px; }.action span { display:grid; width:39px; height:39px; color:#386641; background:#edf4ee; border-radius:12px; place-items:center; }.action em { color:#555c53; font-size:10px; font-style:normal; white-space:nowrap; }.logout { margin-top:18px; background:rgba(255,255,255,.7); }
</style>
