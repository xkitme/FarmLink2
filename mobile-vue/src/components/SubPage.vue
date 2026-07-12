<template>
  <div class="sub-page">
    <header class="sub-page__bar">
      <button type="button" class="sub-page__back" aria-label="返回" @click="back"><van-icon name="arrow-left" size="20" /></button>
      <h1>{{ title }}</h1>
      <span class="sub-page__right"><slot name="right" /></span>
    </header>
    <main class="sub-page__body" :class="{ 'sub-page__body--flush': flush }"><slot /></main>
  </div>
</template>

<script>
export default {
  name: 'SubPage',
  props: {
    title: { type: String, default: '' },
    fallback: { type: String, default: '/home' },
    // flush=true 时去掉内边距，适合整宽图廊 / 大屏。
    flush: { type: Boolean, default: false },
  },
  methods: {
    back() {
      if (window.history.length > 1) this.$router.back()
      else this.$router.replace(this.fallback)
    },
  },
}
</script>

<style scoped>
.sub-page { min-height: 100vh; background: #f4f1e4; }
.sub-page__bar { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 8px; padding: calc(10px + env(safe-area-inset-top)) 14px 10px; background: #fff; border-bottom: 1px solid #ece7d8; }
.sub-page__back { display: grid; width: 34px; height: 34px; padding: 0; color: #386641; background: none; border: 0; place-items: center; }
.sub-page__bar h1 { flex: 1; margin: 0; overflow: hidden; color: #386641; font-size: 18px; font-weight: 700; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
.sub-page__right { display: flex; align-items: center; justify-content: flex-end; min-width: 34px; }
.sub-page__body { max-width: 600px; margin: auto; padding: 14px 16px 28px; }
.sub-page__body--flush { padding: 0 0 28px; }
</style>
