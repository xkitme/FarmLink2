<template>
  <div class="app-shell">
    <AppHeader v-if="showHeader" :title="title" :subtitle="subtitle">
      <template #right><slot name="header-right" /></template>
    </AppHeader>
    <main class="app-shell__body"><slot /></main>
    <nav class="bottom-nav" aria-label="主导航">
      <button v-for="item in navItems" :key="item.name" type="button" class="bottom-nav__item"
        :class="{ 'bottom-nav__item--active': activeName === item.name, 'bottom-nav__item--primary': item.name === 'publish' }"
        @click="go(item.name)">
        <span class="bottom-nav__icon"><van-icon :name="item.icon" :size="item.name === 'publish' ? 24 : 21" /></span>
        <span>{{ item.label }}</span>
      </button>
    </nav>
  </div>
</template>

<script>
import AppHeader from './AppHeader.vue'

export default {
  name: 'AppShell',
  components: { AppHeader },
  props: {
    title: { type: String, default: '田园通' },
    subtitle: { type: String, default: '' },
    showHeader: { type: Boolean, default: true },
    active: { type: String, default: '' }
  },
  data() {
    return {
      navItems: [
        { name: 'home', label: '首页', icon: 'wap-home-o' },
        { name: 'all', label: '服务', icon: 'apps-o' },
        { name: 'publish', label: '发布', icon: 'plus' },
        { name: 'messages', label: '消息', icon: 'chat-o' },
        { name: 'profile', label: '我的', icon: 'user-o' }
      ]
    }
  },
  computed: {
    activeName() { return this.active || (this.$route && this.$route.name) || 'home' }
  },
  methods: {
    go(name) {
      if (name !== this.activeName) this.$router.push({ name })
    }
  }
}
</script>

<style scoped>
.app-shell { min-height: 100vh; color: #2f3a30; background: #f4f1e4; }
.app-shell__body { box-sizing: border-box; min-height: calc(100vh - 54px); padding-bottom: calc(86px + env(safe-area-inset-bottom)); }
.bottom-nav { position: fixed; right: 0; bottom: 0; left: 0; z-index: 30; display: grid; grid-template-columns: repeat(5, 1fr); max-width: 600px; min-height: 66px; margin: auto; padding: 8px 8px calc(6px + env(safe-area-inset-bottom)); background: rgba(255,255,255,.97); border: 1px solid rgba(229,223,206,.9); border-bottom: 0; border-radius: 25px 25px 0 0; box-shadow: 0 -6px 24px rgba(74,65,49,.09); backdrop-filter: blur(14px); }
.bottom-nav__item { position: relative; display: flex; flex-direction: column; gap: 3px; align-items: center; justify-content: center; padding: 0; color: #827966; font: inherit; font-size: 11px; font-weight: 650; background: transparent; border: 0; }
.bottom-nav__icon { display: grid; place-items: center; width: 40px; height: 28px; border-radius: 999px; }
.bottom-nav__item--active { color: #386641; }
.bottom-nav__item--active .bottom-nav__icon { background: #e3f0e6; }
.bottom-nav__item--primary .bottom-nav__icon { width: 48px; height: 48px; margin-top: -23px; color: #fff; background: linear-gradient(145deg,#52b788,#2d6a4f); border: 4px solid #f4f1e4; box-shadow: 0 7px 15px rgba(45,106,79,.28); }
.bottom-nav__item--primary { padding-top: 9px; }
</style>
