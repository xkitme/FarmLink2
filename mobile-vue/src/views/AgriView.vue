<template>
  <SubPage title="农业生产" fallback="/home">
    <!-- 天气 -->
    <section v-if="today" class="weather">
      <div class="weather__now">
        <span class="weather__cond">{{ today.condition }}</span>
        <strong>{{ today.tempLow }}~{{ today.tempHigh }}°</strong>
        <span class="weather__hum">湿度 {{ today.humidity }}% · 风力 {{ today.windLevel }} 级</span>
      </div>
      <p v-if="today.farmTip" class="weather__tip"><van-icon name="bulb-o" size="14" /> {{ today.farmTip }}</p>
      <div class="weather__days">
        <div v-for="d in forecast" :key="d.date" class="weather__day">
          <span>{{ shortDate(d.date) }}</span>
          <em>{{ d.condition }}</em>
          <b>{{ d.tempHigh }}°</b>
        </div>
      </div>
    </section>

    <!-- 快捷入口 -->
    <section class="quick">
      <button type="button" @click="$router.push('/agri/record/new')"><span class="q-ico q-ico--green"><van-icon name="records" size="22" /></span>记一笔农事</button>
      <button type="button" @click="$router.push('/agri/diagnose')"><span class="q-ico q-ico--gold"><van-icon name="scan" size="22" /></span>拍照识病</button>
      <button type="button" @click="scrollToCalendar"><span class="q-ico q-ico--teal"><van-icon name="calendar-o" size="22" /></span>农事日历</button>
    </section>

    <!-- 地块 -->
    <section v-if="plots.length" class="block">
      <h2>我的地块<em>{{ plots.length }}</em></h2>
      <div class="plots">
        <div v-for="p in plots" :key="p.id" class="plot">
          <span class="plot__name">{{ p.plotName }}</span>
          <span class="plot__meta">{{ p.cropType }} · {{ p.areaMu }}亩 · {{ p.soilType || '—' }}</span>
        </div>
      </div>
    </section>

    <!-- 农事记录 -->
    <section class="block">
      <div class="block__head">
        <h2>农事记录</h2>
        <button type="button" class="add-link" @click="$router.push('/agri/record/new')"><van-icon name="plus" size="14" /> 记一笔</button>
      </div>
      <van-list v-model="loading" :finished="finished" finished-text="没有更多记录了" @load="loadMore">
        <div v-for="r in records" :key="r.id" class="record">
          <span class="record__type">{{ r.recordType }}</span>
          <div class="record__body">
            <div class="record__top"><em>{{ r.cropType || '农事' }} · {{ plotName(r.plotId) }}</em><i>{{ shortDate(r.recordDate) }}</i></div>
            <p>{{ r.content }}</p>
            <div v-if="r.images && r.images.length" class="record__imgs">
              <img v-for="(img, i) in r.images.slice(0, 3)" :key="i" :src="resolve(img)" alt="" />
            </div>
            <span v-if="r.cost" class="record__cost">成本 ￥{{ r.cost }}</span>
          </div>
        </div>
      </van-list>
      <van-empty v-if="finished && !records.length && !loading" description="还没有农事记录，点「记一笔」开始" />
    </section>

    <span ref="calendarAnchor"></span>
    <!-- 农事日历 -->
    <section v-if="calendar.length" class="block">
      <h2>{{ month }} 月农事日历</h2>
      <div v-for="c in calendar" :key="c.id" class="cal">
        <span class="cal__term">{{ c.solarTerm }}</span>
        <div class="cal__body"><em>{{ c.cropType }} · {{ c.activity }}</em><p>{{ c.description }}</p></div>
      </div>
    </section>
  </SubPage>
</template>

<script>
import SubPage from '../components/SubPage.vue'
import { resolveImageUrl } from '../api/client'

function payload(res) {
  const v = res && res.data !== undefined ? res.data : res
  return v && v.data !== undefined ? v.data : (v || {})
}

export default {
  name: 'AgriView',
  components: { SubPage },
  data() {
    return { weather: {}, plots: [], calendar: [], month: new Date().getMonth() + 1, records: [], page: 0, pageSize: 10, loading: false, finished: false, plotMap: {} }
  },
  computed: {
    today() { return (this.weather.days || [])[0] || null },
    forecast() { return (this.weather.days || []).slice(1, 5) },
  },
  created() { this.loadHead() },
  methods: {
    resolve(u) { return resolveImageUrl(u) },
    async loadHead() {
      const [w, p, c] = await Promise.allSettled([
        this.$api.get('/agri/weather'),
        this.$api.get('/agri/plot/list'),
        this.$api.get('/agri/calendar'),
      ])
      if (w.status === 'fulfilled') this.weather = payload(w.value) || {}
      if (p.status === 'fulfilled') {
        const list = payload(p.value)
        this.plots = Array.isArray(list) ? list : (list.records || [])
        this.plotMap = this.plots.reduce((m, x) => { m[x.id] = x.plotName; return m }, {})
      }
      if (c.status === 'fulfilled') {
        const data = payload(c.value)
        const items = data.items || []
        const cur = data.currentMonth || this.month
        this.month = cur
        this.calendar = items.filter((x) => x.month === cur).slice(0, 6)
      }
    },
    async loadMore() {
      const next = this.page + 1
      try {
        const data = payload(await this.$api.get('/agri/record/list', { page: next, pageSize: this.pageSize }))
        const records = data.records || []
        this.records = this.records.concat(records)
        this.page = next
        const pages = data.pages || Math.ceil((data.total || 0) / this.pageSize)
        if (this.page >= pages || records.length === 0) this.finished = true
      } catch (_) {
        this.finished = true
      } finally {
        this.loading = false
      }
    },
    plotName(id) { return this.plotMap[id] || '地块' },
    shortDate(iso) {
      if (!iso) return ''
      const d = new Date(iso)
      return `${d.getMonth() + 1}/${d.getDate()}`
    },
    scrollToCalendar() {
      const el = this.$refs.calendarAnchor
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    },
  },
}
</script>

<style scoped>
.weather { margin-bottom: 14px; padding: 16px; color: #fff; background: linear-gradient(135deg, #3e6b4f, #5c8a6d); border-radius: 18px; box-shadow: 0 10px 24px rgba(62,107,79,.2); }
.weather__now { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.weather__cond { font-size: 14px; }
.weather__now strong { font-size: 26px; font-weight: 800; }
.weather__hum { color: rgba(255,255,255,.8); font-size: 12px; }
.weather__tip { margin: 10px 0 0; color: #eafaef; font-size: 12px; line-height: 1.5; }
.weather__days { display: flex; gap: 10px; margin-top: 14px; }
.weather__day { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 9px 0; background: rgba(255,255,255,.12); border-radius: 12px; }
.weather__day span { font-size: 11px; color: rgba(255,255,255,.8); }
.weather__day em { font-size: 11px; font-style: normal; }
.weather__day b { font-size: 14px; }
.quick { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
.quick button { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px 0; font-size: 12px; color: #4e554c; background: #fff; border: 1px solid #e5dfce; border-radius: 14px; }
.q-ico { display: grid; width: 44px; height: 44px; border-radius: 13px; place-items: center; }
.q-ico--green { color: #386641; background: #e7f1e7; }
.q-ico--gold { color: #9a6a24; background: #f8eddc; }
.q-ico--teal { color: #2e6e66; background: #e2f0ee; }
.block { margin-bottom: 16px; }
.block__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.block h2 { display: flex; align-items: center; gap: 6px; margin: 0 0 12px; font-size: 15px; font-weight: 700; color: #2f3a30; }
.block__head h2 { margin: 0; }
.block h2 em { padding: 1px 8px; color: #386641; font-size: 12px; font-style: normal; background: #e7f1e7; border-radius: 999px; }
.add-link { display: inline-flex; align-items: center; gap: 3px; padding: 6px 12px; color: #386641; font-size: 12px; font-weight: 700; background: #e7f1e7; border: 0; border-radius: 999px; }
.plots { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.plot { padding: 12px; background: #fff; border: 1px solid #e5dfce; border-radius: 14px; }
.plot__name { font-weight: 700; font-size: 14px; color: #2f3a30; }
.plot__meta { display: block; margin-top: 5px; color: #a79f8c; font-size: 12px; }
.record { display: flex; gap: 12px; margin-bottom: 10px; padding: 14px; background: #fff; border: 1px solid #e5dfce; border-radius: 14px; }
.record__type { flex: 0 0 auto; align-self: flex-start; padding: 3px 9px; color: #386641; font-size: 11px; background: #e7f1e7; border-radius: 6px; }
.record__body { flex: 1; min-width: 0; }
.record__top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.record__top em { font-style: normal; font-weight: 700; font-size: 14px; color: #2f3a30; }
.record__top i { flex: 0 0 auto; font-style: normal; color: #a79f8c; font-size: 11px; }
.record__body p { margin: 6px 0 0; color: #726a57; font-size: 13px; line-height: 1.55; }
.record__imgs { display: flex; gap: 6px; margin-top: 8px; }
.record__imgs img { width: 56px; height: 56px; object-fit: cover; border-radius: 8px; }
.record__cost { display: inline-block; margin-top: 8px; color: #9a6a24; font-size: 12px; }
.cal { display: flex; gap: 12px; margin-bottom: 10px; padding: 13px; background: #fff; border: 1px solid #e5dfce; border-radius: 14px; }
.cal__term { flex: 0 0 auto; align-self: flex-start; padding: 3px 9px; color: #8a5b17; font-size: 11px; background: #f6ead5; border-radius: 6px; }
.cal__body em { font-style: normal; font-weight: 700; font-size: 14px; color: #2f3a30; }
.cal__body p { margin: 5px 0 0; color: #726a57; font-size: 12px; line-height: 1.55; }
</style>
