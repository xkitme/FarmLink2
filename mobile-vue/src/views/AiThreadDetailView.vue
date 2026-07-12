<template>
  <SubPage title="对话详情" fallback="/ai">
    <div v-if="loading" class="state"><van-loading size="22">加载中…</van-loading></div>
    <van-empty v-else-if="!records.length" description="对话记录不存在" />
    <div v-else class="chat">
      <template v-for="r in records">
        <div :key="'q' + r.id" class="row row--user">
          <div class="bubble bubble--user">{{ r.question }}</div>
        </div>
        <div :key="'a' + r.id" class="row row--ai">
          <span class="avatar"><van-icon name="chat-o" size="16" /></span>
          <div class="bubble bubble--ai">
            {{ r.answer }}
            <span v-if="r.modelUsed" class="bubble__model">{{ r.modelUsed }}</span>
          </div>
        </div>
      </template>
    </div>
  </SubPage>
</template>

<script>
import SubPage from '../components/SubPage.vue'

function payload(res) {
  const v = res && res.data !== undefined ? res.data : res
  return v && v.data !== undefined ? v.data : (v || {})
}

export default {
  name: 'AiThreadDetailView',
  components: { SubPage },
  data() {
    return { records: [], loading: true }
  },
  created() { this.load() },
  methods: {
    async load() {
      this.loading = true
      try {
        const data = payload(await this.$api.get('/ai/qa/threads/' + this.$route.params.id))
        const list = data.records || data.list || (Array.isArray(data) ? data : [])
        // 线程内按时间正序展示（旧在上）
        this.records = list.slice().sort((a, b) => (a.id || 0) - (b.id || 0))
      } catch (_) {
        this.records = []
      } finally {
        this.loading = false
      }
    },
  },
}
</script>

<style scoped>
.state { display: grid; padding: 60px 0; place-items: center; color: #827966; }
.chat { display: flex; flex-direction: column; gap: 14px; }
.row { display: flex; gap: 8px; }
.row--user { justify-content: flex-end; }
.row--ai { justify-content: flex-start; }
.avatar { display: grid; flex: 0 0 auto; width: 32px; height: 32px; color: #fff; background: #386641; border-radius: 50%; place-items: center; }
.bubble { max-width: 78%; padding: 11px 14px; font-size: 14px; line-height: 1.65; border-radius: 16px; white-space: pre-wrap; }
.bubble--user { color: #fff; background: linear-gradient(135deg, #3e6b4f, #52b788); border-bottom-right-radius: 4px; }
.bubble--ai { color: #2f3a30; background: #fff; border: 1px solid #e5dfce; border-bottom-left-radius: 4px; }
.bubble__model { display: block; margin-top: 8px; padding-top: 6px; color: #a79f8c; font-size: 11px; border-top: 1px dashed #ece7d8; }
</style>
