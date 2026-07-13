<template>
  <SubPage title="AI 助手" fallback="/home">
    <template #right>
      <button v-if="items.length" type="button" class="clear-btn" aria-label="清空历史" @click="clearAll"><van-icon name="delete-o" size="19" /></button>
      <button type="button" class="new-btn" aria-label="新对话" @click="$router.push('/ai/chat/new')"><van-icon name="plus" size="18" /></button>
    </template>

    <div class="hero" @click="$router.push('/ai/chat/new')">
      <div class="hero__icon"><van-icon name="chat-o" size="24" /></div>
      <div class="hero__text"><strong>农技智能问答</strong><span>问天气、问病害、问政策，随时开聊</span></div>
      <van-icon name="arrow" size="16" />
    </div>

    <p class="label">历史对话</p>
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model="loading" :finished="finished" finished-text="没有更多记录了" @load="loadMore">
        <van-swipe-cell v-for="t in items" :key="t.threadId || t.id" class="swipe">
          <button type="button" class="thread" @click="open(t)">
            <span class="thread__scene">{{ sceneLabel(t.scene) }}</span>
            <span class="thread__q">{{ t.question }}</span>
            <span class="thread__a">{{ t.answer }}</span>
            <span class="thread__foot"><i>{{ formatTime(t.lastMessageAt || t.createdAt) }}</i><em v-if="t.messageCount">{{ t.messageCount }} 条对话</em></span>
          </button>
          <template #right>
            <button type="button" class="swipe__del" @click="removeThread(t)">删除</button>
          </template>
        </van-swipe-cell>
      </van-list>
      <van-empty v-if="finished && !items.length && !loading" description="还没有对话记录" />
    </van-pull-refresh>
  </SubPage>
</template>

<script>
import SubPage from '../components/SubPage.vue'

function payload(res) {
  const v = res && res.data !== undefined ? res.data : res
  return v && v.data !== undefined ? v.data : (v || {})
}
const SCENE = { GENERAL: '综合问答', AGRI: '农技', POLICY: '政策', LEGAL: '法律', DISEASE: '病害识别' }

export default {
  name: 'AiThreadsView',
  components: { SubPage },
  data() {
    return { items: [], page: 0, pageSize: 10, finished: false, loading: false, refreshing: false }
  },
  methods: {
    sceneLabel(s) { return SCENE[s] || s || '问答' },
    async loadMore() {
      const next = this.page + 1
      try {
        const data = payload(await this.$api.get('/ai/qa/records', { page: next, pageSize: this.pageSize }))
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
    open(t) {
      this.$router.push('/ai/thread/' + (t.threadId || t.id))
    },
    removeThread(t) {
      const id = t.threadId || t.id
      this.$dialog.confirm({ title: '删除对话', message: '确定删除这条对话记录？', confirmButtonColor: '#ba1a1a' })
        .then(async () => {
          try {
            await this.$api.delete('/ai/qa/threads/' + id)
            this.items = this.items.filter((x) => (x.threadId || x.id) !== id)
            this.$toast('已删除')
          } catch (err) {
            this.$toast((err && err.message) || '删除失败')
          }
        })
        .catch(() => {})
    },
    clearAll() {
      this.$dialog.confirm({ title: '清空历史', message: '确定清空全部对话记录？此操作不可恢复。', confirmButtonColor: '#ba1a1a' })
        .then(async () => {
          try {
            await this.$api.delete('/ai/qa/records')
            this.items = []
            this.finished = true
            this.$toast('已清空')
          } catch (err) {
            this.$toast((err && err.message) || '清空失败')
          }
        })
        .catch(() => {})
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
.new-btn { display: grid; width: 34px; height: 34px; padding: 0; color: #fff; background: #386641; border: 0; border-radius: 50%; place-items: center; }
.clear-btn { display: grid; width: 34px; height: 34px; margin-right: 8px; padding: 0; color: #ba1a1a; background: #fbe7e5; border: 0; border-radius: 50%; place-items: center; }
.swipe { margin-bottom: 10px; }
.swipe__del { height: 100%; padding: 0 22px; color: #fff; font-size: 14px; font-weight: 700; background: #ba1a1a; border: 0; }
.hero { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; padding: 16px; color: #fff; background: linear-gradient(135deg, #3e6b4f, #52b788); border-radius: 18px; box-shadow: 0 10px 24px rgba(45, 106, 79, .22); }
.hero__icon { display: grid; width: 46px; height: 46px; background: rgba(255,255,255,.18); border-radius: 14px; place-items: center; }
.hero__text { flex: 1; }
.hero__text strong { display: block; font-size: 16px; }
.hero__text span { margin-top: 3px; font-size: 12px; color: rgba(255,255,255,.82); }
.label { margin: 0 0 12px; color: #8d816b; font-size: 12px; font-weight: 700; }
.thread { display: flex; flex-direction: column; width: 100%; padding: 14px; text-align: left; background: #fff; border: 1px solid #e5dfce; border-radius: 14px; }
.thread__scene { align-self: flex-start; margin-bottom: 8px; padding: 2px 9px; color: #386641; font-size: 11px; background: #e7f1e7; border-radius: 6px; }
.thread__q { overflow: hidden; font-size: 14px; font-weight: 700; color: #2f3a30; text-overflow: ellipsis; white-space: nowrap; }
.thread__a { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; margin-top: 6px; color: #726a57; font-size: 13px; line-height: 1.55; }
.thread__foot { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
.thread__foot i { font-style: normal; color: #a79f8c; font-size: 11px; }
.thread__foot em { font-style: normal; color: #52745b; font-size: 11px; }
</style>
