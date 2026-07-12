<template>
  <div class="screen">
    <button type="button" class="screen__back" aria-label="退出大屏" @click="back"><van-icon name="cross" size="20" /></button>

    <header class="screen__head">
      <div>
        <h1>村级数字驾驶舱</h1>
        <p>{{ dash.year || year }} 年度 · 生产经营实时概览</p>
      </div>
      <div class="clock">
        <strong>{{ clock }}</strong>
        <span>{{ dateText }}</span>
      </div>
    </header>

    <section class="kpis">
      <div v-for="k in kpis" :key="k.label" class="kpi">
        <strong>{{ k.value }}</strong>
        <span>{{ k.label }}</span>
      </div>
    </section>

    <div class="cols">
      <section class="board">
        <h2>种植结构（亩）</h2>
        <div v-for="c in cropArea" :key="c.cropType" class="brow">
          <span class="brow__label">{{ c.cropType }}</span>
          <div class="brow__track"><div class="brow__fill brow__fill--green" :style="{ width: pct(c.areaMu, maxCrop) }"></div></div>
          <span class="brow__val">{{ c.areaMu }}</span>
        </div>
        <p v-if="!cropArea.length" class="empty">暂无数据</p>
      </section>

      <section class="board">
        <h2>灾情统计</h2>
        <div v-for="d in disasterStats" :key="d.type" class="brow">
          <span class="brow__label">{{ d.type }}</span>
          <div class="brow__track"><div class="brow__fill brow__fill--red" :style="{ width: pct(d.count, maxDisaster) }"></div></div>
          <span class="brow__val">{{ d.count }}次</span>
        </div>
        <p v-if="!disasterStats.length" class="empty">近期无灾情</p>
      </section>
    </div>

    <section class="ticker">
      <h2>最新动态</h2>
      <div class="ticker__list">
        <div v-for="r in reports" :key="r.id" class="ticker__item">
          <span class="ticker__tag">{{ r.statType }}</span>
          <p>{{ (r.dataJson && r.dataJson.story) || (r.period + ' 数据已上报') }}</p>
        </div>
      </div>
    </section>

    <p class="screen__foot">数据每 30 秒自动刷新 · 最后更新 {{ updatedAt }}</p>
  </div>
</template>

<script>
function payload(res) {
  const v = res && res.data !== undefined ? res.data : res
  return v && v.data !== undefined ? v.data : (v || {})
}

export default {
  name: 'VillageScreenView',
  data() {
    return { dash: {}, clock: '', dateText: '', updatedAt: '--', year: new Date().getFullYear(), _poll: null, _tick: null }
  },
  computed: {
    kpis() {
      const c = this.dash.cards || {}
      return [
        { label: '服务农户', value: c.userCount || 0 },
        { label: '管理亩数', value: c.totalAreaMu || 0 },
        { label: '农事记录', value: c.recordCount || 0 },
        { label: '惠农订单', value: c.orderCount || 0 },
        { label: '灾情事件', value: c.disasterCount || 0 },
        { label: 'AI 调用', value: c.aiCallCount || 0 },
      ]
    },
    cropArea() { return this.dash.cropArea || [] },
    maxCrop() { return Math.max(1, ...this.cropArea.map((x) => Number(x.areaMu) || 0)) },
    disasterStats() { return this.dash.disasterStats || [] },
    maxDisaster() { return Math.max(1, ...this.disasterStats.map((x) => x.count || 0)) },
    reports() { return (this.dash.latestStatReports || []).slice(0, 5) },
  },
  created() {
    this.load()
    this.updateClock()
    this._poll = window.setInterval(this.load, 30000)
    this._tick = window.setInterval(this.updateClock, 1000)
  },
  beforeDestroy() {
    if (this._poll) window.clearInterval(this._poll)
    if (this._tick) window.clearInterval(this._tick)
  },
  methods: {
    async load() {
      try {
        this.dash = payload(await this.$api.get('/data/dashboard'))
        const now = new Date()
        this.updatedAt = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      } catch (_) { /* 保留上一次数据 */ }
    },
    updateClock() {
      const d = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      this.clock = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
      this.dateText = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    },
    pct(v, max) { return Math.max(6, (Number(v) / max) * 100) + '%' },
    back() {
      if (window.history.length > 1) this.$router.back()
      else this.$router.replace('/data')
    },
  },
}
</script>

<style scoped>
.screen { position: relative; min-height: 100vh; padding: calc(16px + env(safe-area-inset-top)) 16px calc(20px + env(safe-area-inset-bottom)); color: #eaf5ee; background: radial-gradient(120% 80% at 50% 0%, #12362444 0%, transparent 60%), linear-gradient(160deg, #0a1a13, #0f2419 60%, #0a1912); }
.screen__back { position: absolute; top: calc(14px + env(safe-area-inset-top)); right: 14px; z-index: 5; display: grid; width: 36px; height: 36px; color: #eaf5ee; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.18); border-radius: 50%; place-items: center; }
.screen__head { display: flex; align-items: flex-start; justify-content: space-between; padding-right: 44px; margin-bottom: 18px; }
.screen__head h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 1px; background: linear-gradient(90deg, #7bed9f, #52b788); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.screen__head p { margin: 6px 0 0; color: #8fb7a0; font-size: 12px; }
.clock { text-align: right; }
.clock strong { font-size: 20px; font-weight: 800; color: #d8f3dc; font-variant-numeric: tabular-nums; }
.clock span { display: block; margin-top: 2px; color: #6f9682; font-size: 11px; }
.kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
.kpi { padding: 14px 6px; text-align: center; background: rgba(255,255,255,.05); border: 1px solid rgba(123,237,159,.16); border-radius: 14px; }
.kpi strong { font-size: 24px; font-weight: 800; color: #7bed9f; font-variant-numeric: tabular-nums; }
.kpi span { display: block; margin-top: 4px; color: #9fc2ac; font-size: 11px; }
.cols { display: grid; grid-template-columns: 1fr; gap: 12px; margin-bottom: 12px; }
.board { padding: 15px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.09); border-radius: 16px; }
.board h2, .ticker h2 { margin: 0 0 14px; font-size: 14px; font-weight: 700; color: #d8f3dc; }
.brow { display: grid; grid-template-columns: 56px 1fr auto; align-items: center; gap: 10px; margin-bottom: 11px; }
.brow__label { font-size: 12px; color: #b6d3c1; }
.brow__track { height: 9px; background: rgba(255,255,255,.08); border-radius: 999px; overflow: hidden; }
.brow__fill { height: 100%; border-radius: 999px; }
.brow__fill--green { background: linear-gradient(90deg, #52b788, #7bed9f); }
.brow__fill--red { background: linear-gradient(90deg, #e5533c, #ff8a65); }
.brow__val { font-size: 12px; color: #eaf5ee; font-variant-numeric: tabular-nums; }
.empty { margin: 0; color: #6f9682; font-size: 12px; }
.ticker { padding: 15px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.09); border-radius: 16px; }
.ticker__item { display: flex; gap: 10px; padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,.06); }
.ticker__item:last-child { border-bottom: 0; }
.ticker__tag { flex: 0 0 auto; align-self: flex-start; padding: 3px 8px; color: #0a1a13; font-size: 11px; font-weight: 700; background: #7bed9f; border-radius: 6px; }
.ticker__item p { margin: 0; color: #cfe6d8; font-size: 12px; line-height: 1.5; }
.screen__foot { margin: 16px 0 0; color: #5f8271; font-size: 11px; text-align: center; }
</style>
