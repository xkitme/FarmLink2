<template>
  <div class="search-page">
    <header class="search-bar">
      <button type="button" class="search-bar__back" aria-label="返回" @click="back"><van-icon name="arrow-left" size="20" /></button>
      <div class="search-bar__field">
        <van-icon name="search" size="18" />
        <input
          ref="input"
          v-model="keyword"
          type="search"
          enterkeyhint="search"
          placeholder="搜索功能、政策、农技、商品..."
          @keyup.enter="runSearch"
        />
        <van-icon v-if="keyword" name="clear" size="16" @click="clear" />
      </div>
    </header>

    <main class="search-body">
      <!-- 未输入：热门搜索 -->
      <section v-if="!query" class="block">
        <p class="block__title">热门搜索</p>
        <div class="chips">
          <button v-for="word in hotWords" :key="word" type="button" class="chip" @click="useHot(word)">
            <van-icon name="fire-o" size="14" /> {{ word }}
          </button>
        </div>
      </section>

      <!-- 功能命中 -->
      <section v-if="featureHits.length" class="block">
        <p class="block__title">功能</p>
        <div class="feature-hits">
          <button v-for="item in featureHits" :key="item.name" type="button" class="feature-hit" @click="$router.push(item.route)">
            <span class="feature-hit__icon" :style="{ color: item.color, backgroundColor: item.bg }"><van-icon :name="item.icon" size="20" /></span>
            <span class="feature-hit__text"><em>{{ item.name }}</em><small>{{ sectionLabel(item.section) }}</small></span>
          </button>
        </div>
      </section>

      <!-- 加载态 -->
      <div v-if="loading" class="state"><van-loading size="22">搜索中…</van-loading></div>

      <!-- 内容分区 -->
      <template v-else>
        <section v-for="group in visibleGroups" :key="group.key" class="block">
          <p class="block__title">{{ group.title }}</p>
          <button v-for="(item, index) in group.items" :key="group.key + index" type="button" class="result" @click="$router.push(group.route)">
            <span class="result__icon"><van-icon :name="group.icon" size="20" /></span>
            <span class="result__text">
              <em>{{ group.titleOf(item) }}</em>
              <small>{{ group.subtitle(item) || '点击查看对应板块' }}</small>
            </span>
            <van-icon name="arrow" size="14" color="#c3bba6" />
          </button>
        </section>
      </template>

      <!-- 空态 -->
      <div v-if="!loading && query && !featureHits.length && contentEmpty" class="state state--empty">
        <van-icon name="search" size="30" color="#c3bba6" />
        <p>没有找到「{{ query }}」相关结果</p>
      </div>
    </main>
  </div>
</template>

<script>
import { SECTION_LABEL, matchFeatures } from '../data/features.js'

function payload(res) {
  const v = res && res.data !== undefined ? res.data : res
  return v && v.data !== undefined ? v.data : (v || {})
}
function list(value) {
  return Array.isArray(value) ? value.filter((x) => x && typeof x === 'object') : []
}
function text(value, fallback = '') {
  const t = String(value == null ? '' : value).trim()
  return !t || t === 'null' ? fallback : t
}
function join(parts) {
  return parts.filter((p) => String(p || '').trim()).join(' · ')
}

export default {
  name: 'SearchView',
  data() {
    return {
      keyword: '',
      query: '',
      loading: false,
      content: {},
      hotWords: ['补贴', '行情', '病虫害', '农机', '天气'],
    }
  },
  computed: {
    featureHits() {
      return this.query ? matchFeatures(this.query, 8) : []
    },
    contentGroups() {
      const c = this.content
      return [
        { key: 'policy', title: '政策', icon: 'balance-list-o', route: '/policy', items: list(c.policy),
          titleOf: (i) => text(i.title, '政策'), subtitle: (i) => join([text(i.level), text(i.category), text(i.summary)]) },
        { key: 'disease', title: '农技', icon: 'flower-o', route: '/agri', items: list(c.disease),
          titleOf: (i) => text(i.diseaseName, '农技结果'), subtitle: (i) => join([text(i.cropType), text(i.category)]) },
        { key: 'product', title: '商品', icon: 'shop-o', route: '/market', items: list(c.product),
          titleOf: (i) => text(i.title, '商品'), subtitle: (i) => join([this.price(i), text(i.category)]) },
        { key: 'job', title: '招工', icon: 'friends-o', route: '/life', items: list(c.job),
          titleOf: (i) => text(i.title, '招工'), subtitle: (i) => join([text(i.company), text(i.salary), text(i.jobType)]) },
        { key: 'course', title: '课程', icon: 'notes-o', route: '/policy/service', items: list(c.course),
          titleOf: (i) => text(i.title, '课程'), subtitle: (i) => join([text(i.category), text(i.instructor)]) },
      ]
    },
    visibleGroups() {
      return this.contentGroups.filter((g) => g.items.length > 0)
    },
    contentEmpty() {
      return this.contentGroups.every((g) => g.items.length === 0)
    },
  },
  mounted() {
    const initial = String(this.$route.query.q || '').trim()
    if (initial) {
      this.keyword = initial
      this.runSearch()
    } else if (this.$refs.input) {
      this.$refs.input.focus()
    }
  },
  methods: {
    sectionLabel(key) {
      return SECTION_LABEL[key] || key
    },
    price(item) {
      if (item.price == null) return ''
      const unit = text(item.unit)
      return `￥${item.price}${unit ? '/' + unit : ''}`
    },
    async runSearch() {
      const q = this.keyword.trim()
      if (!q) return
      this.query = q
      this.content = {}
      this.loading = true
      try {
        const data = await this.$api.get('/search', { keyword: q })
        this.content = payload(data) || {}
      } catch (_) {
        this.content = {}
      } finally {
        this.loading = false
      }
    },
    useHot(word) {
      this.keyword = word
      this.runSearch()
    },
    clear() {
      this.keyword = ''
      this.query = ''
      this.content = {}
      this.loading = false
      this.$nextTick(() => this.$refs.input && this.$refs.input.focus())
    },
    back() {
      if (window.history.length > 1) this.$router.back()
      else this.$router.replace({ name: 'home' })
    },
  },
}
</script>

<style scoped>
.search-page { min-height: 100vh; background: #f4f1e4; }
.search-bar { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 8px; padding: calc(8px + env(safe-area-inset-top)) 14px 8px; background: #fff; border-bottom: 1px solid #ece7d8; }
.search-bar__back { display: grid; width: 34px; height: 34px; padding: 0; color: #726a57; background: none; border: 0; place-items: center; }
.search-bar__field { display: flex; flex: 1; align-items: center; gap: 8px; height: 42px; padding: 0 12px; color: #827966; background: #f4f1e4; border: 1.5px solid #e5dfce; border-radius: 10px; }
.search-bar__field input { flex: 1; min-width: 0; height: 100%; color: #2f3a30; font-size: 15px; background: none; border: 0; outline: none; }
.search-body { max-width: 600px; margin: auto; padding: 14px 16px 28px; }
.block { margin-bottom: 18px; }
.block__title { margin: 0 0 12px; color: #8d816b; font-size: 12px; font-weight: 700; }
.chips { display: flex; flex-wrap: wrap; gap: 10px; }
.chip { display: inline-flex; align-items: center; gap: 4px; padding: 8px 14px; color: #4e554c; font-size: 13px; font-weight: 600; background: #fff; border: 1px solid #e5dfce; border-radius: 999px; }
.feature-hits { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.feature-hit { display: flex; align-items: center; gap: 10px; padding: 12px; background: #fff; border: 1px solid #e5dfce; border-radius: 14px; text-align: left; }
.feature-hit__icon { display: grid; flex: 0 0 auto; width: 38px; height: 38px; border-radius: 12px; place-items: center; }
.feature-hit__text { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.feature-hit__text em { overflow: hidden; color: #2f3a30; font-size: 14px; font-weight: 700; font-style: normal; text-overflow: ellipsis; white-space: nowrap; }
.feature-hit__text small { color: #827966; font-size: 12px; }
.result { display: flex; align-items: center; gap: 10px; width: 100%; margin-bottom: 10px; padding: 12px 14px; background: #fff; border: 1px solid #e5dfce; border-radius: 14px; text-align: left; }
.result__icon { display: grid; flex: 0 0 auto; width: 38px; height: 38px; color: #386641; background: #e7f1e7; border-radius: 12px; place-items: center; }
.result__text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.result__text em { overflow: hidden; color: #2f3a30; font-size: 14px; font-weight: 700; font-style: normal; text-overflow: ellipsis; white-space: nowrap; }
.result__text small { overflow: hidden; color: #827966; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.state { display: grid; padding: 40px 0; place-items: center; color: #827966; }
.state--empty { gap: 12px; }
.state--empty p { margin: 0; font-size: 13px; }
</style>
