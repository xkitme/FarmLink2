<template>
  <SubPage title="我的订单" fallback="/market">
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model="loading" :finished="finished" finished-text="没有更多订单了" @load="loadMore">
        <div v-for="o in items" :key="o.id" class="order">
          <div class="order__head">
            <span class="order__no">订单号 {{ o.orderNo }}</span>
            <span class="order__status" :style="{ color: statusMeta(o.status).color, backgroundColor: statusMeta(o.status).bg }">{{ statusMeta(o.status).label }}</span>
          </div>
          <div class="order__product">
            <span class="order__thumb"><van-icon name="shop-o" size="22" /></span>
            <div class="order__info">
              <em>{{ productTitle(o) }}</em>
              <small>数量 {{ o.quantity }} {{ productUnit(o) }}</small>
            </div>
            <b class="order__amount">￥{{ o.totalAmount }}</b>
          </div>
          <div class="order__receiver">
            <van-icon name="location-o" size="13" /> {{ receiver(o) }}
          </div>
          <div class="order__foot">{{ formatTime(o.createdAt) }}</div>
        </div>
      </van-list>
      <van-empty v-if="finished && !items.length && !loading" description="还没有订单" />
    </van-pull-refresh>
  </SubPage>
</template>

<script>
import SubPage from '../components/SubPage.vue'

function payload(res) {
  const v = res && res.data !== undefined ? res.data : res
  return v && v.data !== undefined ? v.data : (v || {})
}
const STATUS = {
  PENDING: { label: '待付款', color: '#ba1a1a', bg: '#fbe7e5' },
  PAID: { label: '待发货', color: '#9a6a24', bg: '#f8eddc' },
  SHIPPED: { label: '待收货', color: '#2e6e66', bg: '#e2f0ee' },
  DONE: { label: '已完成', color: '#386641', bg: '#e7f1e7' },
  CANCELLED: { label: '已取消', color: '#8d816b', bg: '#efeade' },
}

export default {
  name: 'OrdersView',
  components: { SubPage },
  data() {
    return { items: [], page: 0, pageSize: 10, finished: false, loading: false, refreshing: false }
  },
  methods: {
    statusMeta(s) { return STATUS[s] || { label: s || '处理中', color: '#526258', bg: '#e9ece9' } },
    productTitle(o) { return (o.product && o.product.title) || '商品' },
    productUnit(o) { return (o.product && o.product.unit) || '件' },
    receiver(o) {
      const r = o.receiverInfo || {}
      const name = r.realName || r.name || ''
      return [name, r.phone, r.address].filter(Boolean).join(' · ') || '未填写收货信息'
    },
    async loadMore() {
      const next = this.page + 1
      try {
        const data = payload(await this.$api.get('/market/order/list', { page: next, pageSize: this.pageSize }))
        const records = data.records || data.list || []
        this.items = this.items.concat(records)
        this.page = next
        const pages = data.pages || Math.ceil((data.total || records.length) / this.pageSize)
        if (this.page >= pages || records.length === 0) this.finished = true
      } catch (_) {
        this.finished = true
      } finally {
        this.loading = false
        this.refreshing = false
      }
    },
    onRefresh() {
      this.items = []
      this.page = 0
      this.finished = false
      this.loadMore()
    },
    formatTime(iso) {
      if (!iso) return ''
      const d = new Date(iso)
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    },
  },
}
</script>

<style scoped>
.order { margin-bottom: 12px; padding: 14px; background: #fff; border: 1px solid #e5dfce; border-radius: 16px; }
.order__head { display: flex; align-items: center; justify-content: space-between; padding-bottom: 11px; border-bottom: 1px solid #f0ecde; }
.order__no { color: #a79f8c; font-size: 12px; }
.order__status { padding: 3px 10px; font-size: 12px; font-weight: 700; border-radius: 999px; }
.order__product { display: flex; align-items: center; gap: 12px; padding: 12px 0; }
.order__thumb { display: grid; flex: 0 0 auto; width: 44px; height: 44px; color: #386641; background: #e7f1e7; border-radius: 12px; place-items: center; }
.order__info { flex: 1; min-width: 0; }
.order__info em { display: block; overflow: hidden; font-style: normal; font-weight: 700; font-size: 14px; color: #2f3a30; text-overflow: ellipsis; white-space: nowrap; }
.order__info small { color: #a79f8c; font-size: 12px; }
.order__amount { flex: 0 0 auto; color: #ba1a1a; font-size: 16px; font-weight: 800; }
.order__receiver { padding: 10px 0 0; color: #726a57; font-size: 12px; line-height: 1.5; border-top: 1px solid #f0ecde; }
.order__foot { margin-top: 8px; color: #a79f8c; font-size: 11px; }
</style>
