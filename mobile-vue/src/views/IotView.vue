<template>
  <SubPage title="智能物联" fallback="/data">
    <div v-if="loading" class="state"><van-loading size="22">加载中…</van-loading></div>
    <template v-else>
      <section class="block">
        <h2>感知设备<em>{{ devices.length }}</em></h2>
        <div v-for="d in devices" :key="d.id" class="device">
          <div class="device__head">
            <span class="device__name">{{ d.name }}</span>
            <span class="device__state" :class="d.online ? 'is-online' : 'is-offline'">{{ d.online ? '在线' : '离线' }}</span>
          </div>
          <div class="device__meta"><van-icon name="location-o" size="12" /> {{ d.location }} · 电量 {{ d.battery }}%</div>
          <div class="metrics">
            <div v-for="m in d.metrics" :key="m.key" class="metric" :class="'is-' + (m.status || 'normal')">
              <strong>{{ m.value }}<i>{{ m.unit }}</i></strong>
              <span>{{ m.label }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="block">
        <h2>联动规则<em>{{ rules.length }}</em></h2>
        <div v-for="r in rules" :key="r.id" class="rule">
          <div class="rule__top">
            <div>
              <span class="rule__name">{{ r.name }}</span>
              <p class="rule__desc">{{ r.desc }}</p>
            </div>
            <van-switch :value="r.enabled" size="22px" active-color="#386641" :loading="toggling === r.id" @input="toggle(r)" />
          </div>
          <div class="rule__cond">
            <span class="rule__chip">{{ r.deviceName }}</span>
            <span class="rule__chip">{{ r.metricLabel }} {{ r.op }} {{ r.threshold }}{{ r.unit }}</span>
            <span class="rule__chip rule__chip--now">当前 {{ r.currentValue }}{{ r.unit }}</span>
          </div>
          <div class="rule__action"><van-icon name="aim" size="13" /> {{ r.action }}</div>
        </div>
      </section>

      <section v-if="logs.length" class="block">
        <h2>联动记录</h2>
        <div v-for="l in logs" :key="l.id" class="log">
          <span class="log__dot"></span>
          <div class="log__body">
            <em>{{ l.ruleName }}</em>
            <p>{{ l.message }}（{{ l.metricLabel }} {{ l.value }}{{ l.unit }}）</p>
            <small>{{ formatTime(l.createdAt) }} · {{ l.result }}</small>
          </div>
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
function asArray(v) { return Array.isArray(v) ? v : (v && Array.isArray(v.records) ? v.records : []) }

export default {
  name: 'IotView',
  components: { SubPage },
  data() {
    return { devices: [], rules: [], logs: [], loading: true, toggling: '' }
  },
  created() { this.load() },
  methods: {
    async load() {
      this.loading = true
      try {
        const [d, r, l] = await Promise.allSettled([
          this.$api.get('/iot/devices'),
          this.$api.get('/iot/linkage/rules'),
          this.$api.get('/iot/linkage/logs'),
        ])
        if (d.status === 'fulfilled') this.devices = asArray(payload(d.value))
        if (r.status === 'fulfilled') this.rules = asArray(payload(r.value))
        if (l.status === 'fulfilled') this.logs = asArray(payload(l.value)).slice(0, 6)
      } finally {
        this.loading = false
      }
    },
    async toggle(rule) {
      const target = !rule.enabled
      this.toggling = rule.id
      try {
        await this.$api.post(`/iot/linkage/rules/${rule.id}/toggle`, { enabled: target })
        rule.enabled = target
        this.$toast(target ? '已启用联动' : '已停用联动')
      } catch (_) {
        this.$toast('操作失败，请稍后重试')
      } finally {
        this.toggling = ''
      }
    },
    formatTime(iso) {
      if (!iso) return ''
      const d = new Date(iso)
      const pad = (n) => String(n).padStart(2, '0')
      return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    },
  },
}
</script>

<style scoped>
.state { display: grid; padding: 60px 0; place-items: center; color: #827966; }
.block { margin-bottom: 16px; }
.block h2 { display: flex; align-items: center; gap: 6px; margin: 0 0 12px; font-size: 15px; font-weight: 700; color: #2f3a30; }
.block h2 em { padding: 1px 8px; color: #386641; font-size: 12px; font-style: normal; background: #e7f1e7; border-radius: 999px; }
.device { margin-bottom: 12px; padding: 14px; background: #fff; border: 1px solid #e5dfce; border-radius: 16px; }
.device__head { display: flex; align-items: center; justify-content: space-between; }
.device__name { font-weight: 700; font-size: 14px; color: #2f3a30; }
.device__state { padding: 2px 9px; font-size: 11px; font-weight: 700; border-radius: 999px; }
.device__state.is-online { color: #386641; background: #e7f1e7; }
.device__state.is-offline { color: #8d816b; background: #efeade; }
.device__meta { margin: 7px 0 12px; color: #a79f8c; font-size: 12px; }
.metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.metric { display: flex; flex-direction: column; align-items: center; padding: 10px 4px; background: #f4f7f2; border-radius: 12px; }
.metric strong { font-size: 17px; font-weight: 800; color: #2f3a30; }
.metric strong i { font-size: 10px; font-weight: 500; font-style: normal; color: #a79f8c; }
.metric span { margin-top: 3px; font-size: 11px; color: #726a57; }
.metric.is-warning { background: #fdf4e3; }
.metric.is-warning strong { color: #9a6a24; }
.metric.is-danger { background: #fbe7e5; }
.metric.is-danger strong { color: #ba1a1a; }
.rule { margin-bottom: 12px; padding: 14px; background: #fff; border: 1px solid #e5dfce; border-radius: 16px; }
.rule__top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.rule__name { font-weight: 700; font-size: 14px; color: #2f3a30; }
.rule__desc { margin: 5px 0 0; color: #726a57; font-size: 12px; line-height: 1.5; }
.rule__cond { display: flex; flex-wrap: wrap; gap: 6px; margin: 11px 0; }
.rule__chip { padding: 4px 9px; color: #4e554c; font-size: 11px; background: #f4f1e4; border: 1px solid #ece7d8; border-radius: 7px; }
.rule__chip--now { color: #386641; background: #e7f1e7; border-color: #d6e6d8; }
.rule__action { display: flex; align-items: center; gap: 5px; color: #52745b; font-size: 12px; }
.log { display: flex; gap: 10px; padding: 10px 0; }
.log__dot { flex: 0 0 auto; width: 8px; height: 8px; margin-top: 6px; background: #52b788; border-radius: 50%; }
.log__body em { font-style: normal; font-weight: 700; font-size: 13px; color: #2f3a30; }
.log__body p { margin: 3px 0; color: #726a57; font-size: 12px; line-height: 1.5; }
.log__body small { color: #a79f8c; font-size: 11px; }
</style>
