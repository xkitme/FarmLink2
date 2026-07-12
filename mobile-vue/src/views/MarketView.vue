<template>
  <SubPage title="乡村集市" fallback="/home">
    <template #right>
      <button type="button" class="order-btn" aria-label="我的订单" @click="$router.push('/market/orders')"><van-icon name="orders-o" size="20" /></button>
    </template>

    <button class="search" type="button" @click="$router.push('/search')"><van-icon name="search" size="18" /><span>搜索农产品、文创、农资</span></button>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list v-model="loading" :finished="finished" finished-text="没有更多商品了" @load="loadMore">
        <div class="grid">
          <button v-for="p in items" :key="p.id" type="button" class="product" @click="$router.push('/market/product/' + p.id)">
            <span class="product__thumb">
              <img v-if="cover(p)" :src="cover(p)" alt="" @error="onImgError(p)" />
              <span v-else class="product__ph"><van-icon name="shop-o" size="28" /></span>
              <em v-if="p.category" class="product__cat">{{ p.category }}</em>
            </span>
            <span class="product__title">{{ p.title }}</span>
            <span class="product__foot">
              <b>￥{{ p.price }}<i>/{{ p.unit || '件' }}</i></b>
              <small>已售{{ p.soldCount || 0 }}</small>
            </span>
          </button>
        </div>
      </van-list>
      <van-empty v-if="finished && !items.length && !loading" description="暂无商品" />
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
  name: 'MarketView',
  components: { SubPage },
  data() {
    return { items: [], page: 0, pageSize: 10, finished: false, loading: false, refreshing: false, broken: {} }
  },
  methods: {
    cover(p) {
      if (this.broken[p.id]) return ''
      const img = (p.images || [])[0]
      return img ? resolveImageUrl(img) : ''
    },
    onImgError(p) {
      this.$set(this.broken, p.id, true)
    },
    async loadMore() {
      const next = this.page + 1
      try {
        const data = payload(await this.$api.get('/market/product/list', { page: next, pageSize: this.pageSize }))
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
.order-btn { display: grid; width: 34px; height: 34px; padding: 0; color: #386641; background: #edf4ee; border: 0; border-radius: 50%; place-items: center; }
.search { display: flex; align-items: center; gap: 10px; width: 100%; height: 44px; margin-bottom: 14px; padding: 0 16px; color: #a79f8c; font-size: 14px; background: #fff; border: 1px solid #e5dfce; border-radius: 999px; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.product { display: flex; flex-direction: column; overflow: hidden; text-align: left; background: #fff; border: 1px solid #e5dfce; border-radius: 16px; }
.product__thumb { position: relative; display: block; width: 100%; height: 130px; background: #eef0e9; }
.product__thumb img { width: 100%; height: 100%; object-fit: cover; }
.product__ph { display: grid; width: 100%; height: 100%; color: #9db5a3; background: linear-gradient(135deg, #e7f1e7, #dbeae0); place-items: center; }
.product__cat { position: absolute; top: 8px; left: 8px; padding: 3px 8px; color: #fff; font-size: 10px; font-style: normal; background: rgba(56, 102, 65, .82); border-radius: 6px; }
.product__title { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; min-height: 40px; margin: 10px 12px 0; font-size: 14px; font-weight: 600; line-height: 1.4; color: #2f3a30; }
.product__foot { display: flex; align-items: baseline; justify-content: space-between; margin: 8px 12px 12px; }
.product__foot b { color: #ba1a1a; font-size: 17px; font-weight: 800; }
.product__foot b i { font-size: 11px; font-weight: 500; font-style: normal; color: #a79f8c; }
.product__foot small { color: #a79f8c; font-size: 11px; }
</style>
