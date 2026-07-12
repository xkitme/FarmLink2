<template>
  <SubPage title="商品详情" fallback="/market" flush>
    <div v-if="loading" class="state"><van-loading size="22">加载中…</van-loading></div>
    <div v-else-if="error" class="state state--error">
      <van-icon name="warning-o" size="30" color="#c3bba6" />
      <p>商品加载失败</p>
      <van-button size="small" plain color="#386641" @click="load">重试</van-button>
    </div>
    <template v-else>
      <div class="gallery">
        <img v-if="cover" :src="cover" alt="" @error="broken = true" />
        <span v-else class="gallery__ph"><van-icon name="shop-o" size="46" /></span>
      </div>

      <div class="section price-block">
        <div class="price"><b>￥{{ product.price }}</b><i>/{{ product.unit || '件' }}</i></div>
        <div class="price-block__meta"><span>已售 {{ product.soldCount || 0 }}</span><span>库存 {{ product.stock != null ? product.stock : '—' }}</span></div>
        <h1>{{ product.title }}</h1>
        <span v-if="product.category" class="tag">{{ product.category }}</span>
      </div>

      <div class="section">
        <h2>商品介绍</h2>
        <p class="desc">{{ product.description || '暂无商品介绍。' }}</p>
      </div>

      <div v-if="product.seller" class="section seller">
        <h2>卖家信息</h2>
        <div class="seller__row">
          <span class="seller__avatar">{{ (product.seller.nickname || '卖')[0] }}</span>
          <div class="seller__info">
            <em>{{ product.seller.nickname || '卖家' }}</em>
            <small>{{ product.seller.villageName || '本地商家' }}</small>
          </div>
        </div>
      </div>

      <div class="section trace" v-if="product.traceCode">
        <van-icon name="certificate" size="18" color="#386641" />
        <span>该商品支持溯源，编码 {{ product.traceCode }}</span>
      </div>
    </template>

    <template v-if="!loading && !error">
      <div class="buy-bar">
        <div class="buy-bar__price"><b>￥{{ product.price }}</b><i>/{{ product.unit || '件' }}</i></div>
        <button type="button" class="buy-bar__btn" @click="buy">立即购买</button>
      </div>
    </template>
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
  name: 'ProductDetailView',
  components: { SubPage },
  data() {
    return { product: {}, loading: true, error: false, broken: false }
  },
  computed: {
    cover() {
      if (this.broken) return ''
      const img = (this.product.images || [])[0]
      return img ? resolveImageUrl(img) : ''
    },
  },
  created() { this.load() },
  methods: {
    async load() {
      this.loading = true
      this.error = false
      try {
        this.product = payload(await this.$api.get('/market/product/' + this.$route.params.id))
      } catch (_) {
        this.error = true
      } finally {
        this.loading = false
      }
    },
    buy() {
      // 下单闭环属于 P3 业务写；P2 只读，先诚实提示不误导。
      this.$toast('下单功能将在后续版本接入')
    },
  },
}
</script>

<style scoped>
.state { display: grid; gap: 12px; padding: 60px 0; place-items: center; color: #827966; }
.gallery { width: 100%; height: 280px; background: #eef0e9; }
.gallery img { width: 100%; height: 100%; object-fit: cover; }
.gallery__ph { display: grid; width: 100%; height: 100%; color: #9db5a3; background: linear-gradient(135deg, #e7f1e7, #dbeae0); place-items: center; }
.section { margin: 10px 12px 0; padding: 16px; background: #fff; border: 1px solid #e5dfce; border-radius: 16px; }
.section h2 { margin: 0 0 10px; font-size: 15px; font-weight: 700; color: #2f3a30; }
.price-block { margin-top: -20px; position: relative; z-index: 2; }
.price { display: flex; align-items: baseline; }
.price b { color: #ba1a1a; font-size: 26px; font-weight: 800; }
.price i { margin-left: 2px; color: #a79f8c; font-size: 13px; font-style: normal; }
.price-block__meta { display: flex; gap: 16px; margin: 6px 0 12px; color: #a79f8c; font-size: 12px; }
.price-block h1 { margin: 0; font-size: 18px; font-weight: 700; line-height: 1.45; color: #2f3a30; }
.tag { display: inline-block; margin-top: 10px; padding: 4px 10px; color: #386641; font-size: 12px; background: #e7f1e7; border-radius: 7px; }
.desc { margin: 0; color: #4e554c; font-size: 14px; line-height: 1.8; white-space: pre-wrap; }
.seller__row { display: flex; align-items: center; gap: 12px; }
.seller__avatar { display: grid; width: 44px; height: 44px; color: #386641; font-size: 18px; font-weight: 800; background: #e3f0e6; border-radius: 50%; place-items: center; }
.seller__info em { font-style: normal; font-weight: 700; font-size: 15px; color: #2f3a30; }
.seller__info small { display: block; margin-top: 2px; color: #a79f8c; font-size: 12px; }
.trace { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #4e554c; }
.buy-bar { position: sticky; bottom: 0; display: flex; align-items: center; gap: 14px; margin-top: 12px; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #ece7d8; }
.buy-bar__price { flex: 1; }
.buy-bar__price b { color: #ba1a1a; font-size: 20px; font-weight: 800; }
.buy-bar__price i { color: #a79f8c; font-size: 12px; font-style: normal; }
.buy-bar__btn { padding: 0 30px; height: 46px; color: #fff; font-size: 15px; font-weight: 700; background: linear-gradient(135deg, #3e6b4f, #52b788); border: 0; border-radius: 999px; box-shadow: 0 8px 18px rgba(45, 106, 79, .28); }
</style>
