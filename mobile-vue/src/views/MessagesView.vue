<template>
  <AppShell title="消息" subtitle="通知与预警" active="messages">
    <template #header-right>
      <button v-if="hasUnread" class="header-button" type="button" @click="markAllRead"><van-icon name="success" size="20" /></button>
    </template>
    <div class="messages">
      <div class="filter">
        <button v-for="f in filters" :key="f.key" type="button" :class="{ active: type === f.key }" @click="switchType(f.key)">
          {{ f.label }}<em v-if="f.count"> {{ f.count }}</em>
        </button>
      </div>

      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list v-model="loading" :finished="finished" finished-text="没有更多消息了" @load="loadMore">
          <button v-for="item in items" :key="item.id" type="button" class="msg" :class="{ 'msg--unread': !item.isRead }" @click="open(item)">
            <span class="msg__icon" :style="{ color: meta(item.type).color, backgroundColor: meta(item.type).bg }"><van-icon :name="meta(item.type).icon" size="19" /></span>
            <span class="msg__body">
              <span class="msg__head"><em>{{ item.title }}</em><i>{{ formatTime(item.createdAt) }}</i></span>
              <span class="msg__content">{{ item.content }}</span>
            </span>
            <span v-if="!item.isRead" class="msg__dot"></span>
          </button>
        </van-list>
        <van-empty v-if="finished && !items.length && !loading" description="暂无消息" />
      </van-pull-refresh>
    </div>
  </AppShell>
</template>

<script>
import AppShell from '../components/AppShell.vue'

function payload(res) {
  const v = res && res.data !== undefined ? res.data : res
  return v && v.data !== undefined ? v.data : (v || {})
}
const TYPE_META = {
  ALERT: { label: '预警', icon: 'warning-o', color: '#ba1a1a', bg: '#fbe7e5' },
  SYSTEM: { label: '系统', icon: 'bell', color: '#386641', bg: '#e7f1e7' },
  ORDER: { label: '订单', icon: 'orders-o', color: '#9a6a24', bg: '#f8eddc' },
  POLICY: { label: '政策', icon: 'description', color: '#3e6b4f', bg: '#e6efe8' },
}

export default {
  name: 'MessagesView',
  components: { AppShell },
  data() {
    return { items: [], page: 0, pageSize: 15, finished: false, loading: false, refreshing: false, type: 'all', typeCounts: {} }
  },
  computed: {
    filters() {
      const list = [{ key: 'all', label: '全部', count: 0 }]
      Object.keys(this.typeCounts).forEach((key) => {
        list.push({ key, label: this.meta(key).label, count: this.typeCounts[key] || 0 })
      })
      return list
    },
    hasUnread() {
      return this.items.some((m) => !m.isRead) || (this.$store.state.notification.unread || 0) > 0
    },
  },
  methods: {
    meta(type) {
      return TYPE_META[type] || { label: type || '通知', icon: 'chat-o', color: '#526258', bg: '#e9ece9' }
    },
    async loadMore() {
      const next = this.page + 1
      const query = { page: next, pageSize: this.pageSize }
      if (this.type !== 'all') query.type = this.type
      try {
        const data = payload(await this.$api.get('/notification/list', query))
        const records = data.records || data.list || []
        this.items = this.items.concat(records)
        this.page = next
        if (data.typeCounts) this.typeCounts = data.typeCounts
        if (data.unread != null) this.$store.commit('notification/setUnread', data.unread)
        const pages = data.pages || Math.ceil((data.total || 0) / this.pageSize)
        if (this.page >= pages || records.length === 0) this.finished = true
      } catch (_) {
        this.finished = true
      } finally {
        this.loading = false
        this.refreshing = false
      }
    },
    reset() {
      this.items = []
      this.page = 0
      this.finished = false
    },
    onRefresh() {
      this.reset()
      this.loadMore()
    },
    switchType(key) {
      if (this.type === key) return
      this.type = key
      this.reset()
      this.loading = true
      this.loadMore()
    },
    async open(item) {
      if (!item.isRead) {
        item.isRead = true
        this.$store.commit('notification/setUnread', Math.max(0, (this.$store.state.notification.unread || 1) - 1))
        try { await this.$api.put(`/notification/${item.id}/read`) } catch (_) { /* ignore */ }
      }
    },
    async markAllRead() {
      this.items.forEach((m) => { m.isRead = true })
      this.$store.commit('notification/setUnread', 0)
      try { await this.$api.put('/notification/read-all') } catch (_) { /* ignore */ }
    },
    formatTime(iso) {
      if (!iso) return ''
      const d = new Date(iso)
      const now = new Date()
      const sameDay = d.toDateString() === now.toDateString()
      const pad = (n) => String(n).padStart(2, '0')
      if (sameDay) return `${pad(d.getHours())}:${pad(d.getMinutes())}`
      return `${d.getMonth() + 1}月${d.getDate()}日`
    },
  },
}
</script>

<style scoped>
.header-button { display: grid; width: 36px; height: 36px; padding: 0; color: #386641; background: #edf4ee; border: 0; border-radius: 50%; place-items: center; }
.messages { max-width: 600px; margin: auto; padding: 12px 14px 20px; }
.filter { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 12px; scrollbar-width: none; }
.filter::-webkit-scrollbar { display: none; }
.filter button { flex: 0 0 auto; padding: 7px 14px; color: #726a57; font-size: 12px; background: #fff; border: 1px solid #e5dfce; border-radius: 999px; }
.filter button.active { color: #fff; font-weight: 700; background: #386641; border-color: #386641; }
.filter em { font-style: normal; opacity: .8; }
.msg { display: flex; align-items: flex-start; gap: 12px; width: 100%; margin-bottom: 10px; padding: 14px; text-align: left; background: #fff; border: 1px solid #e5dfce; border-radius: 14px; }
.msg--unread { background: #fbfdf9; border-color: #d6e6d8; }
.msg__icon { display: grid; flex: 0 0 auto; width: 38px; height: 38px; border-radius: 12px; place-items: center; }
.msg__body { flex: 1; min-width: 0; }
.msg__head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.msg__head em { overflow: hidden; font-style: normal; font-weight: 700; font-size: 14px; color: #2f3a30; text-overflow: ellipsis; white-space: nowrap; }
.msg__head i { flex: 0 0 auto; font-style: normal; font-size: 11px; color: #a79f8c; }
.msg__content { display: block; margin-top: 5px; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; color: #726a57; font-size: 13px; line-height: 1.55; }
.msg__dot { flex: 0 0 auto; width: 8px; height: 8px; margin-top: 5px; background: #ba1a1a; border-radius: 50%; }
</style>
