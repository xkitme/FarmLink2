<template>
  <SubPage title="惠农政策" fallback="/home">
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model="loading" :finished="finished" finished-text="没有更多政策了" :error.sync="error" error-text="加载失败，点击重试" @load="loadMore">
        <button v-for="item in items" :key="item.id" type="button" class="policy-card" @click="$router.push('/policy/' + item.id)">
          <div class="policy-card__head">
            <span class="policy-card__level">{{ item.level || '政策' }}</span>
            <span v-if="item.category" class="policy-card__cat">{{ item.category }}</span>
          </div>
          <h2>{{ item.title }}</h2>
          <p v-if="item.summary" class="policy-card__summary">{{ item.summary }}</p>
          <div class="policy-card__foot">
            <span>{{ item.publishOrg || '发布机构' }}</span>
            <span><van-icon name="eye-o" size="13" /> {{ item.viewCount || 0 }}</span>
          </div>
        </button>
      </van-list>
      <van-empty v-if="finished && !items.length && !loading" description="暂无政策" />
    </van-pull-refresh>
  </SubPage>
</template>

<script>
import SubPage from '../components/SubPage.vue'

function payload(res) {
  const v = res && res.data !== undefined ? res.data : res
  return v && v.data !== undefined ? v.data : (v || {})
}

export default {
  name: 'PolicyView',
  components: { SubPage },
  data() {
    return { items: [], page: 0, pageSize: 10, finished: false, loading: false, refreshing: false, error: false }
  },
  methods: {
    async loadMore() {
      const next = this.page + 1
      try {
        const data = payload(await this.$api.get('/policy/list', { page: next, pageSize: this.pageSize }))
        const records = data.records || data.list || []
        this.items = this.items.concat(records)
        this.page = next
        const pages = data.pages || Math.ceil((data.total || 0) / this.pageSize)
        if (this.page >= pages || records.length === 0) this.finished = true
      } catch (_) {
        this.error = true
      } finally {
        this.loading = false
        this.refreshing = false
      }
    },
    onRefresh() {
      this.items = []
      this.page = 0
      this.finished = false
      this.error = false
      this.loadMore()
    },
  },
}
</script>

<style scoped>
.policy-card { display: block; width: 100%; margin-bottom: 12px; padding: 15px; text-align: left; background: #fff; border: 1px solid #e5dfce; border-radius: 16px; }
.policy-card__head { display: flex; gap: 8px; margin-bottom: 9px; }
.policy-card__level { padding: 3px 9px; color: #fff; font-size: 11px; font-weight: 700; background: #386641; border-radius: 7px; }
.policy-card__cat { padding: 3px 9px; color: #8a5b17; font-size: 11px; background: #f6ead5; border-radius: 7px; }
.policy-card h2 { margin: 0; font-size: 15px; font-weight: 700; line-height: 1.45; color: #2f3a30; }
.policy-card__summary { margin: 8px 0 0; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; color: #726a57; font-size: 13px; line-height: 1.6; }
.policy-card__foot { display: flex; align-items: center; justify-content: space-between; margin-top: 11px; color: #a79f8c; font-size: 12px; }
.policy-card__foot span { display: inline-flex; align-items: center; gap: 3px; }
</style>
