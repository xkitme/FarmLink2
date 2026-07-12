<template>
  <SubPage title="农机共享" fallback="/home">
    <template #right>
      <button type="button" class="mine-btn" aria-label="我的预约" @click="$router.push('/machinery/bookings')"><van-icon name="notes-o" size="20" /></button>
    </template>

    <button class="search" type="button" @click="$router.push('/search')"><van-icon name="search" size="18" /><span>搜索农机、机手</span></button>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model="loading" :finished="finished" finished-text="没有更多农机了" @load="loadMore">
        <button v-for="m in items" :key="m.id" type="button" class="machine" @click="$router.push('/machinery/' + m.id)">
          <span class="machine__thumb">
            <img v-if="cover(m)" :src="cover(m)" alt="" @error="onErr(m)" />
            <span v-else class="machine__ph"><van-icon name="logistics" size="26" /></span>
          </span>
          <div class="machine__body">
            <div class="machine__top"><em>{{ m.machineName }}</em><span class="machine__rating"><van-icon name="star" size="12" /> {{ m.rating || '—' }}</span></div>
            <span class="machine__type">{{ m.machineType }} · 累计作业 {{ m.totalHours || 0 }}h</span>
            <p class="machine__desc">{{ m.description }}</p>
            <div class="machine__foot"><b>￥{{ m.dailyPrice }}<i>/天</i></b><span>押金 ￥{{ m.deposit || 0 }}</span></div>
          </div>
        </button>
      </van-list>
      <van-empty v-if="finished && !items.length && !loading" description="暂无农机" />
    </van-pull-refresh>
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
  name: 'MachineryView',
  components: { SubPage },
  data() {
    return { items: [], page: 0, pageSize: 10, finished: false, loading: false, refreshing: false, broken: {} }
  },
  methods: {
    cover(m) {
      if (this.broken[m.id]) return ''
      const img = (m.images || [])[0]
      return img ? resolveImageUrl(img) : ''
    },
    onErr(m) { this.$set(this.broken, m.id, true) },
    async loadMore() {
      const next = this.page + 1
      try {
        const data = payload(await this.$api.get('/machinery/list', { page: next, pageSize: this.pageSize }))
        const records = data.records || data.list || []
        this.items = this.items.concat(records)
        this.page = next
        const pages = data.pages || Math.ceil((data.total || 0) / this.pageSize)
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
  },
}
</script>

<style scoped>
.mine-btn { display: grid; width: 34px; height: 34px; padding: 0; color: #386641; background: #edf4ee; border: 0; border-radius: 50%; place-items: center; }
.search { display: flex; align-items: center; gap: 10px; width: 100%; height: 44px; margin-bottom: 14px; padding: 0 16px; color: #a79f8c; font-size: 14px; background: #fff; border: 1px solid #e5dfce; border-radius: 999px; }
.machine { display: flex; gap: 12px; width: 100%; margin-bottom: 12px; padding: 12px; text-align: left; background: #fff; border: 1px solid #e5dfce; border-radius: 16px; }
.machine__thumb { flex: 0 0 auto; width: 92px; height: 92px; overflow: hidden; border-radius: 12px; }
.machine__thumb img { width: 100%; height: 100%; object-fit: cover; }
.machine__ph { display: grid; width: 100%; height: 100%; color: #9db5a3; background: linear-gradient(135deg, #e2f0ee, #d5e8e4); place-items: center; }
.machine__body { flex: 1; min-width: 0; }
.machine__top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.machine__top em { overflow: hidden; font-style: normal; font-weight: 700; font-size: 15px; color: #2f3a30; text-overflow: ellipsis; white-space: nowrap; }
.machine__rating { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 2px; color: #dda15e; font-size: 12px; }
.machine__type { display: block; margin-top: 4px; color: #a79f8c; font-size: 12px; }
.machine__desc { margin: 6px 0 0; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; color: #726a57; font-size: 12px; }
.machine__foot { display: flex; align-items: baseline; justify-content: space-between; margin-top: 8px; }
.machine__foot b { color: #ba1a1a; font-size: 17px; font-weight: 800; }
.machine__foot b i { font-size: 11px; font-weight: 500; font-style: normal; color: #a79f8c; }
.machine__foot span { color: #a79f8c; font-size: 11px; }
</style>
