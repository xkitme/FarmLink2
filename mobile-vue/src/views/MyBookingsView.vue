<template>
  <SubPage title="我的预约" fallback="/machinery">
    <div v-if="loading" class="state"><van-loading size="22">加载中…</van-loading></div>
    <template v-else>
      <div v-for="b in items" :key="b.id" class="booking">
        <div class="booking__head">
          <em>{{ machineName(b) }}</em>
          <span class="booking__status" :style="{ color: meta(b.status).color, backgroundColor: meta(b.status).bg }">{{ meta(b.status).label }}</span>
        </div>
        <div class="booking__row"><van-icon name="clock-o" size="13" /> {{ dateRange(b) }}</div>
        <div class="booking__row"><van-icon name="balance-o" size="13" /> 预估金额 ￥{{ b.totalAmount || 0 }}</div>
        <p v-if="b.remark" class="booking__remark">备注：{{ b.remark }}</p>
      </div>
      <van-empty v-if="!items.length" description="还没有预约" />
    </template>
  </SubPage>
</template>

<script>
import SubPage from '../components/SubPage.vue'

function payload(res) {
  const v = res && res.data !== undefined ? res.data : res
  return v && v.data !== undefined ? v.data : (v || {})
}
const STATUS = {
  PENDING: { label: '待确认', color: '#9a6a24', bg: '#f8eddc' },
  CONFIRMED: { label: '已确认', color: '#386641', bg: '#e7f1e7' },
  ONGOING: { label: '作业中', color: '#2e6e66', bg: '#e2f0ee' },
  DONE: { label: '已完成', color: '#526258', bg: '#e9ece9' },
  CANCELLED: { label: '已取消', color: '#8d816b', bg: '#efeade' },
}

export default {
  name: 'MyBookingsView',
  components: { SubPage },
  data() {
    return { items: [], loading: true }
  },
  created() { this.load() },
  methods: {
    meta(s) { return STATUS[s] || { label: s || '处理中', color: '#526258', bg: '#e9ece9' } },
    machineName(b) { return (b.machinery && b.machinery.machineName) || '农机' },
    dateRange(b) {
      const f = (iso) => {
        if (!iso) return ''
        const d = new Date(iso)
        return `${d.getMonth() + 1}/${d.getDate()}`
      }
      return `${f(b.startDate)} - ${f(b.endDate)}`
    },
    async load() {
      this.loading = true
      try {
        const data = payload(await this.$api.get('/machinery/booking/list'))
        this.items = data.records || data.list || []
      } catch (_) {
        this.items = []
      } finally {
        this.loading = false
      }
    },
  },
}
</script>

<style scoped>
.state { display: grid; padding: 60px 0; place-items: center; color: #827966; }
.booking { margin-bottom: 12px; padding: 14px; background: #fff; border: 1px solid #e5dfce; border-radius: 16px; }
.booking__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.booking__head em { font-style: normal; font-weight: 700; font-size: 15px; color: #2f3a30; }
.booking__status { padding: 3px 10px; font-size: 12px; font-weight: 700; border-radius: 999px; }
.booking__row { display: flex; align-items: center; gap: 6px; margin-top: 6px; color: #4e554c; font-size: 13px; }
.booking__remark { margin: 10px 0 0; padding-top: 10px; color: #726a57; font-size: 12px; border-top: 1px solid #f0ecde; }
</style>
