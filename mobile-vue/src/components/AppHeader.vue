<template>
  <header class="app-header" :class="{ 'app-header--transparent': transparent }">
    <button v-if="back" class="app-header__action" type="button" aria-label="返回" @click="handleBack">
      <van-icon name="arrow-left" size="21" />
    </button>
    <div v-else class="app-header__brand-mark" aria-hidden="true">
      <van-icon name="cluster-o" size="19" />
    </div>

    <div class="app-header__title-wrap">
      <div class="app-header__title">{{ title }}</div>
      <div v-if="subtitle" class="app-header__subtitle">{{ subtitle }}</div>
    </div>

    <div class="app-header__right">
      <slot name="right" />
    </div>
  </header>
</template>

<script>
export default {
  name: 'AppHeader',
  props: {
    title: { type: String, default: '田园通' },
    subtitle: { type: String, default: '' },
    back: { type: Boolean, default: false },
    transparent: { type: Boolean, default: false }
  },
  methods: {
    handleBack() {
      if (window.history.length > 1) this.$router.back()
      else this.$router.replace({ name: 'home' })
    }
  }
}
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 40px;
  align-items: center;
  min-height: 54px;
  padding: env(safe-area-inset-top) 14px 0;
  color: #2f3a30;
  background: rgba(255, 255, 255, 0.96);
  border-bottom: 1px solid #e5dfce;
  backdrop-filter: blur(14px);
}
.app-header--transparent { background: transparent; border-bottom-color: transparent; backdrop-filter: none; }
.app-header__action { display: grid; place-items: center; width: 36px; height: 36px; padding: 0; color: inherit; background: transparent; border: 0; border-radius: 50%; }
.app-header__brand-mark { display: grid; place-items: center; width: 34px; height: 34px; color: #fff; background: #386641; border-radius: 11px; }
.app-header__title-wrap { min-width: 0; text-align: center; }
.app-header__title { overflow: hidden; font-size: 18px; font-weight: 800; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
.app-header__subtitle { margin-top: 2px; overflow: hidden; color: #726a57; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.app-header__right { display: flex; align-items: center; justify-content: flex-end; min-width: 36px; }
</style>
