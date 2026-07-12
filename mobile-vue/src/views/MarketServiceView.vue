<template>
  <SubPage title="集市服务" fallback="/market">
    <!-- 溯源查询 -->
    <section class="trace">
      <h2>农产品溯源</h2>
      <div class="trace__box">
        <input v-model="traceCode" type="text" placeholder="输入溯源码查询" @keyup.enter="queryTrace" />
        <button type="button" :disabled="tracing" @click="queryTrace"><van-loading v-if="tracing" size="16" color="#fff" /><span v-else>查询</span></button>
      </div>
      <div v-if="traceResult" class="trace__result">
        <div class="trace__title"><van-icon name="certificate" size="16" color="#386641" /> {{ traceResult.productName || traceResult.title || '溯源结果' }}</div>
        <div v-for="(r, i) in traceRecords" :key="i" class="trace__step">
          <span class="trace__dot"></span>
          <div><em>{{ r.stage || r.action || r.title }}</em><p>{{ r.detail || r.content || r.description }}</p><small v-if="r.time || r.date">{{ r.time || r.date }}</small></div>
        </div>
      </div>
      <p v-else-if="traceMsg" class="trace__msg">{{ traceMsg }}</p>
    </section>

    <!-- 团购 -->
    <section class="block">
      <h2>农资团购</h2>
      <div v-for="g in groupbuys" :key="g.id" class="group">
        <div class="group__row"><em>{{ g.title }}</em><b>￥{{ g.unitPrice }}</b></div>
        <span class="group__item">{{ g.itemName }}<i v-if="g.category"> · {{ g.category }}</i></span>
        <div class="group__bar"><div class="group__fill" :style="{ width: progress(g) }"></div></div>
        <div class="group__foot"><span>已拼 {{ g.currentCount }}/{{ g.targetCount }}</span><span :class="{ 'is-open': g.status === 'OPEN' }">{{ g.status === 'OPEN' ? '进行中' : '已结束' }}</span></div>
      </div>
      <van-empty v-if="!groupbuys.length && !loading" description="暂无团购" />
    </section>

    <!-- 收购站 -->
    <section class="block">
      <h2>收购站</h2>
      <div v-for="b in buyers" :key="b.id" class="buyer">
        <em>{{ b.name }}</em>
        <p><van-icon name="location-o" size="12" /> {{ b.address }}</p>
        <p>{{ b.contactName }} · {{ b.phone }}</p>
        <span v-if="b.products" class="buyer__products">收购：{{ b.products }}</span>
      </div>
      <van-empty v-if="!buyers.length && !loading" description="暂无收购站" />
    </section>
  </SubPage>
</template>

<script>
import SubPage from '../components/SubPage.vue'

function payload(res) {
  const v = res && res.data !== undefined ? res.data : res
  return v && v.data !== undefined ? v.data : (v || {})
}
function listOf(d) { return Array.isArray(d) ? d : (d.records || d.list || []) }

export default {
  name: 'MarketServiceView',
  components: { SubPage },
  data() {
    return { traceCode: '', tracing: false, traceResult: null, traceMsg: '', groupbuys: [], buyers: [], loading: true }
  },
  computed: {
    traceRecords() {
      const r = this.traceResult || {}
      return r.records || r.traces || r.timeline || []
    },
  },
  created() { this.load() },
  methods: {
    progress(g) {
      const p = g.progress != null ? g.progress : (g.targetCount ? Math.round((g.currentCount / g.targetCount) * 100) : 0)
      return Math.min(100, Math.max(4, p)) + '%'
    },
    async load() {
      this.loading = true
      const [g, b] = await Promise.allSettled([
        this.$api.get('/market/groupbuy/list'),
        this.$api.get('/market/buyer/list'),
      ])
      if (g.status === 'fulfilled') this.groupbuys = listOf(payload(g.value))
      if (b.status === 'fulfilled') this.buyers = listOf(payload(b.value))
      this.loading = false
    },
    async queryTrace() {
      const code = this.traceCode.trim()
      if (!code) { this.$toast('请输入溯源码'); return }
      this.tracing = true
      this.traceResult = null
      this.traceMsg = ''
      try {
        this.traceResult = payload(await this.$api.get('/market/trace/' + encodeURIComponent(code)))
        if (!this.traceResult || (!this.traceRecords.length && !this.traceResult.productName && !this.traceResult.title)) {
          this.traceResult = null
          this.traceMsg = '未查询到该溯源码的记录'
        }
      } catch (_) {
        this.traceMsg = '未查询到该溯源码的记录'
      } finally {
        this.tracing = false
      }
    },
  },
}
</script>

<style scoped>
.trace { margin-bottom: 16px; padding: 16px; background: #fff; border: 1px solid #e5dfce; border-radius: 16px; }
.trace h2, .block h2 { margin: 0 0 12px; font-size: 15px; font-weight: 700; color: #2f3a30; }
.trace__box { display: flex; gap: 10px; }
.trace__box input { flex: 1; padding: 11px 13px; font-size: 14px; color: #2f3a30; background: #f7f8f5; border: 1px solid #e5dfce; border-radius: 10px; }
.trace__box button { flex: 0 0 auto; min-width: 68px; color: #fff; font-size: 14px; font-weight: 700; background: #386641; border: 0; border-radius: 10px; }
.trace__box button:disabled { opacity: .6; }
.trace__result { margin-top: 14px; padding-top: 14px; border-top: 1px solid #f0ecde; }
.trace__title { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 14px; color: #2f3a30; margin-bottom: 12px; }
.trace__step { display: flex; gap: 10px; padding: 6px 0; }
.trace__dot { flex: 0 0 auto; width: 8px; height: 8px; margin-top: 6px; background: #52b788; border-radius: 50%; }
.trace__step em { font-style: normal; font-weight: 700; font-size: 13px; color: #2f3a30; }
.trace__step p { margin: 3px 0; color: #726a57; font-size: 12px; }
.trace__step small { color: #a79f8c; font-size: 11px; }
.trace__msg { margin: 14px 0 0; color: #a79f8c; font-size: 13px; }
.block { margin-bottom: 16px; }
.group { margin-bottom: 12px; padding: 14px; background: #fff; border: 1px solid #e5dfce; border-radius: 14px; }
.group__row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.group__row em { font-style: normal; font-weight: 700; font-size: 15px; color: #2f3a30; }
.group__row b { flex: 0 0 auto; color: #ba1a1a; font-size: 17px; font-weight: 800; }
.group__item { display: block; margin: 5px 0 10px; color: #a79f8c; font-size: 12px; }
.group__item i { font-style: normal; }
.group__bar { height: 8px; background: #f0ecde; border-radius: 999px; overflow: hidden; }
.group__fill { height: 100%; background: linear-gradient(90deg, #52b788, #386641); border-radius: 999px; }
.group__foot { display: flex; justify-content: space-between; margin-top: 8px; color: #a79f8c; font-size: 12px; }
.group__foot .is-open { color: #386641; font-weight: 700; }
.buyer { margin-bottom: 12px; padding: 14px; background: #fff; border: 1px solid #e5dfce; border-radius: 14px; }
.buyer em { font-style: normal; font-weight: 700; font-size: 15px; color: #2f3a30; }
.buyer p { display: flex; align-items: center; gap: 4px; margin: 7px 0 0; color: #726a57; font-size: 13px; }
.buyer__products { display: inline-block; margin-top: 9px; padding: 4px 10px; color: #386641; font-size: 12px; background: #e7f1e7; border-radius: 7px; }
</style>
