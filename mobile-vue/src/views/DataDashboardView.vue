<template>
  <SubPage title="数据看板" fallback="/home">
    <template #right>
      <button type="button" class="screen-btn" aria-label="村级大屏" @click="$router.push('/data/screen')"><van-icon name="tv-o" size="20" /></button>
    </template>

    <div v-if="loading" class="state"><van-loading size="22">加载中…</van-loading></div>
    <template v-else>
      <p class="year">{{ dash.year || '' }} 年 · 村域生产经营概览</p>

      <section class="cards">
        <div v-for="c in cardList" :key="c.label" class="card" :style="{ background: c.bg }">
          <strong :style="{ color: c.color }">{{ c.value }}</strong>
          <span>{{ c.label }}</span>
        </div>
      </section>

      <section v-if="cropArea.length" class="panel">
        <h2>种植结构</h2>
        <div class="donut-row">
          <svg class="donut" viewBox="0 0 42 42">
            <circle class="donut__base" cx="21" cy="21" r="15.915" />
            <circle v-for="(seg, i) in donut" :key="i" class="donut__seg" cx="21" cy="21" r="15.915"
              :stroke="seg.color" :stroke-dasharray="seg.dash" :stroke-dashoffset="seg.offset" />
            <text x="21" y="20" class="donut__num">{{ totalArea }}</text>
            <text x="21" y="25.5" class="donut__unit">亩</text>
          </svg>
          <ul class="legend">
            <li v-for="(seg, i) in donut" :key="i">
              <span class="dot" :style="{ background: seg.color }"></span>
              <em>{{ seg.label }}</em>
              <b>{{ seg.value }}亩</b>
            </li>
          </ul>
        </div>
      </section>

      <section v-if="disasterStats.length" class="panel">
        <h2>灾情统计</h2>
        <div v-for="d in disasterStats" :key="d.type" class="bar-row">
          <span class="bar-row__label">{{ d.type }}</span>
          <div class="bar-row__track"><div class="bar-row__fill" :style="{ width: barWidth(d.count, maxDisaster) }"></div></div>
          <span class="bar-row__val">{{ d.count }}次 · 损失{{ d.loss }}元</span>
        </div>
      </section>

      <section v-if="farmRecordTypes.length" class="panel">
        <h2>农事记录类型</h2>
        <div class="chips">
          <span v-for="f in farmRecordTypes" :key="f.type" class="chip">{{ f.type }} <b>{{ f.count }}</b></span>
        </div>
      </section>

      <section v-if="reports.length" class="panel">
        <h2>最近统计上报</h2>
        <div v-for="r in reports" :key="r.id" class="report">
          <div class="report__head"><em>{{ r.statType }}</em><span>{{ r.period }} · {{ statusText(r.status) }}</span></div>
          <p v-if="r.dataJson && r.dataJson.story">{{ r.dataJson.story }}</p>
        </div>
      </section>
    </template>
  </SubPage>
</template>

<script>
import SubPage from '../components/SubPage.vue'

function payload(res) {
  const v = res && res.data !== undefined ? res.data : res
  return v && v.data !== undefined ? v.data : (v || {})
}
const DONUT_COLORS = ['#386641', '#52b788', '#dda15e', '#2e6e66', '#9a6a24', '#bc6c25']

export default {
  name: 'DataDashboardView',
  components: { SubPage },
  data() {
    return { dash: {}, loading: true }
  },
  computed: {
    cardList() {
      const c = this.dash.cards || {}
      return [
        { label: '服务农户', value: c.userCount || 0, color: '#386641', bg: '#e7f1e7' },
        { label: '管理亩数', value: c.totalAreaMu || 0, color: '#2e6e66', bg: '#e2f0ee' },
        { label: '农事记录', value: c.recordCount || 0, color: '#386641', bg: '#e7f1e7' },
        { label: '惠农订单', value: c.orderCount || 0, color: '#9a6a24', bg: '#f8eddc' },
        { label: '灾情事件', value: c.disasterCount || 0, color: '#ba1a1a', bg: '#fbe7e5' },
        { label: 'AI 调用', value: c.aiCallCount || 0, color: '#2d6a4f', bg: '#e1f2e9' },
      ]
    },
    cropArea() { return this.dash.cropArea || [] },
    totalArea() { return this.cropArea.reduce((s, x) => s + (Number(x.areaMu) || 0), 0) },
    donut() {
      const total = this.totalArea || 1
      let acc = 0
      return this.cropArea.map((x, i) => {
        const value = Number(x.areaMu) || 0
        const pct = (value / total) * 100
        const seg = { label: x.cropType, value, color: DONUT_COLORS[i % DONUT_COLORS.length], dash: `${pct} ${100 - pct}`, offset: 25 - acc }
        acc += pct
        return seg
      })
    },
    disasterStats() { return this.dash.disasterStats || [] },
    maxDisaster() { return Math.max(1, ...this.disasterStats.map((d) => d.count || 0)) },
    farmRecordTypes() { return this.dash.farmRecordTypes || [] },
    reports() { return (this.dash.latestStatReports || []).slice(0, 4) },
  },
  created() { this.load() },
  methods: {
    async load() {
      this.loading = true
      try {
        this.dash = payload(await this.$api.get('/data/dashboard'))
      } catch (_) {
        this.dash = {}
      } finally {
        this.loading = false
      }
    },
    barWidth(v, max) { return Math.max(6, (v / max) * 100) + '%' },
    statusText(s) { return ({ CONFIRMED: '已确认', SUBMITTED: '已提交', DRAFT: '草稿' })[s] || s || '' },
  },
}
</script>

<style scoped>
.screen-btn { display: grid; width: 34px; height: 34px; padding: 0; color: #386641; background: #edf4ee; border: 0; border-radius: 50%; place-items: center; }
.state { display: grid; padding: 60px 0; place-items: center; color: #827966; }
.year { margin: 0 0 14px; color: #8d816b; font-size: 12px; font-weight: 600; }
.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.card { display: flex; flex-direction: column; align-items: center; padding: 15px 6px; border-radius: 14px; }
.card strong { font-size: 22px; font-weight: 800; }
.card span { margin-top: 4px; color: #726a57; font-size: 11px; }
.panel { margin-top: 14px; padding: 16px; background: #fff; border: 1px solid #e5dfce; border-radius: 16px; }
.panel h2 { margin: 0 0 14px; font-size: 15px; font-weight: 700; color: #2f3a30; }
.donut-row { display: flex; align-items: center; gap: 18px; }
.donut { width: 112px; height: 112px; flex: 0 0 auto; transform: rotate(-90deg); }
.donut__base { fill: none; stroke: #eef0e9; stroke-width: 5; }
.donut__seg { fill: none; stroke-width: 5; stroke-linecap: butt; }
.donut__num { transform: rotate(90deg); transform-origin: 21px 21px; font-size: 8px; font-weight: 800; fill: #2f3a30; text-anchor: middle; }
.donut__unit { transform: rotate(90deg); transform-origin: 21px 21px; font-size: 3.4px; fill: #a79f8c; text-anchor: middle; }
.legend { flex: 1; margin: 0; padding: 0; list-style: none; }
.legend li { display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 13px; }
.legend .dot { width: 10px; height: 10px; border-radius: 3px; }
.legend em { flex: 1; color: #4e554c; font-style: normal; }
.legend b { color: #2f3a30; }
.bar-row { display: grid; grid-template-columns: 50px 1fr auto; align-items: center; gap: 10px; margin-bottom: 12px; }
.bar-row__label { font-size: 13px; color: #4e554c; }
.bar-row__track { height: 10px; background: #f0ecde; border-radius: 999px; overflow: hidden; }
.bar-row__fill { height: 100%; background: linear-gradient(90deg, #52b788, #386641); border-radius: 999px; }
.bar-row__val { font-size: 11px; color: #a79f8c; }
.chips { display: flex; flex-wrap: wrap; gap: 9px; }
.chip { padding: 7px 12px; font-size: 13px; color: #4e554c; background: #f4f1e4; border: 1px solid #e5dfce; border-radius: 999px; }
.chip b { color: #386641; }
.report { padding: 12px 0; border-bottom: 1px solid #f0ecde; }
.report:last-child { border-bottom: 0; }
.report__head { display: flex; align-items: center; justify-content: space-between; }
.report__head em { font-style: normal; font-weight: 700; font-size: 14px; color: #2f3a30; }
.report__head span { font-size: 12px; color: #a79f8c; }
.report p { margin: 6px 0 0; font-size: 13px; line-height: 1.6; color: #726a57; }
</style>
