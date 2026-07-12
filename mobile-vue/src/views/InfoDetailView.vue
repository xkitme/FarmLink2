<template>
  <div class="info-detail">
    <header class="info-detail__bar">
      <button type="button" class="info-detail__back" aria-label="返回" @click="back"><van-icon name="arrow-left" size="20" /></button>
      <h1>{{ data.title }}</h1>
      <span class="info-detail__spacer"></span>
    </header>

    <main class="info-detail__body">
      <img v-if="data.image" :src="resolvedImage" alt="" class="info-detail__image" @error="imageError = true" />

      <p v-if="data.body" class="info-detail__text">{{ data.body }}</p>

      <template v-for="(section, index) in data.sections || []">
        <h2 v-if="section.subtitle" :key="'st' + index" class="info-detail__subtitle">{{ section.subtitle }}</h2>
        <p v-if="section.body" :key="'sb' + index" class="info-detail__text">{{ section.body }}</p>
        <p v-for="(item, i) in section.items || []" :key="'si' + index + '-' + i" class="info-detail__item">· {{ item }}</p>
      </template>

      <button v-if="data.actionLabel && data.actionRoute" type="button" class="info-detail__action" @click="doAction">
        {{ data.actionLabel }}
      </button>
    </main>
  </div>
</template>

<script>
import { resolveImageUrl } from '../api/client'

const FALLBACK = {
  title: '详情',
  body: '暂无更多内容。',
  sections: [],
}

export default {
  name: 'InfoDetailView',
  data() {
    return { imageError: false }
  },
  computed: {
    data() {
      const fromStore = this.$store.state.ui && this.$store.state.ui.detail
      if (fromStore && (fromStore.title || fromStore.body || (fromStore.sections && fromStore.sections.length))) {
        return fromStore
      }
      const q = this.$route.query || {}
      if (q.title || q.body) {
        return { title: q.title || '详情', body: q.body || '', sections: [] }
      }
      return FALLBACK
    },
    resolvedImage() {
      return this.imageError ? '' : resolveImageUrl(this.data.image)
    },
  },
  beforeDestroy() {
    this.$store.commit('ui/clearDetail')
  },
  methods: {
    back() {
      if (window.history.length > 1) this.$router.back()
      else this.$router.replace({ name: 'home' })
    },
    doAction() {
      const route = this.data.actionRoute
      this.$store.commit('ui/clearDetail')
      this.$router.push(route)
    },
  },
}
</script>

<style scoped>
.info-detail { min-height: 100vh; background: #f4f1e4; }
.info-detail__bar { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 8px; padding: calc(10px + env(safe-area-inset-top)) 14px 10px; background: #fff; border-bottom: 1px solid #ece7d8; }
.info-detail__back { display: grid; width: 34px; height: 34px; padding: 0; color: #386641; background: none; border: 0; place-items: center; }
.info-detail__bar h1 { flex: 1; margin: 0; overflow: hidden; color: #386641; font-size: 18px; font-weight: 700; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
.info-detail__spacer { width: 34px; }
.info-detail__body { max-width: 600px; margin: auto; padding: 16px 20px 32px; }
.info-detail__image { width: 100%; height: 180px; margin-bottom: 14px; object-fit: cover; border-radius: 16px; }
.info-detail__text { margin: 0 0 12px; color: #3a423a; font-size: 14px; line-height: 1.75; white-space: pre-wrap; }
.info-detail__subtitle { margin: 18px 0 8px; color: #2f3a30; font-size: 16px; font-weight: 700; }
.info-detail__item { margin: 0 0 6px; color: #3a423a; font-size: 14px; line-height: 1.6; }
.info-detail__action { width: 100%; height: 48px; margin-top: 22px; color: #fff; font-size: 15px; font-weight: 700; background: linear-gradient(135deg, #3e6b4f, #52b788); border: 0; border-radius: 14px; box-shadow: 0 8px 18px rgba(45, 106, 79, .25); }
</style>
