<template>
  <SubPage title="政策详情" fallback="/policy">
    <div v-if="loading" class="state"><van-loading size="22">加载中…</van-loading></div>
    <div v-else-if="error" class="state state--error">
      <van-icon name="warning-o" size="30" color="#c3bba6" />
      <p>加载失败</p>
      <van-button size="small" plain color="#386641" @click="load">重试</van-button>
    </div>
    <article v-else class="policy">
      <div class="policy__head">
        <span class="policy__level">{{ policy.level || '政策' }}</span>
        <span v-if="policy.category" class="policy__cat">{{ policy.category }}</span>
      </div>
      <h1>{{ policy.title }}</h1>
      <div class="policy__meta">
        <span>{{ policy.publishOrg || '发布机构' }}</span>
        <span v-if="policy.viewCount != null"><van-icon name="eye-o" size="13" /> {{ policy.viewCount }}</span>
      </div>
      <p v-if="policy.summary" class="policy__summary">{{ policy.summary }}</p>
      <div class="policy__content">{{ policy.content || '暂无详细内容。' }}</div>
    </article>
  </SubPage>
</template>

<script>
import SubPage from '../components/SubPage.vue'

function payload(res) {
  const v = res && res.data !== undefined ? res.data : res
  return v && v.data !== undefined ? v.data : (v || {})
}

export default {
  name: 'PolicyDetailView',
  components: { SubPage },
  data() {
    return { policy: {}, loading: true, error: false }
  },
  created() {
    this.load()
  },
  methods: {
    async load() {
      this.loading = true
      this.error = false
      try {
        this.policy = payload(await this.$api.get('/policy/' + this.$route.params.id))
      } catch (_) {
        this.error = true
      } finally {
        this.loading = false
      }
    },
  },
}
</script>

<style scoped>
.state { display: grid; gap: 12px; padding: 60px 0; place-items: center; color: #827966; }
.policy__head { display: flex; gap: 8px; margin-bottom: 12px; }
.policy__level { padding: 4px 10px; color: #fff; font-size: 12px; font-weight: 700; background: #386641; border-radius: 8px; }
.policy__cat { padding: 4px 10px; color: #8a5b17; font-size: 12px; background: #f6ead5; border-radius: 8px; }
.policy h1 { margin: 0; font-size: 20px; font-weight: 800; line-height: 1.4; color: #2f3a30; }
.policy__meta { display: flex; gap: 14px; margin-top: 10px; color: #a79f8c; font-size: 12px; }
.policy__meta span { display: inline-flex; align-items: center; gap: 3px; }
.policy__summary { margin: 14px 0 0; padding: 12px 14px; color: #4e554c; font-size: 13px; line-height: 1.7; background: #fff; border-left: 3px solid #52b788; border-radius: 0 10px 10px 0; }
.policy__content { margin-top: 16px; color: #3a423a; font-size: 15px; line-height: 1.85; white-space: pre-wrap; }
</style>
