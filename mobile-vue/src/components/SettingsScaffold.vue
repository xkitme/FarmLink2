<template>
  <div class="settings-scaffold">
    <header class="settings-bar">
      <button type="button" class="settings-bar__back" aria-label="返回" @click="back"><van-icon name="arrow-left" size="20" /></button>
      <h1>{{ title }}</h1>
      <span class="settings-bar__spacer"></span>
    </header>
    <main class="settings-scaffold__body"><slot /></main>
  </div>
</template>

<script>
export default {
  name: 'SettingsScaffold',
  props: {
    title: { type: String, default: '设置' },
    fallback: { type: String, default: '/profile' },
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
.settings-scaffold { min-height: 100vh; background: #f4f1e4; }
.settings-bar { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 8px; padding: calc(10px + env(safe-area-inset-top)) 14px 10px; background: #fff; border-bottom: 1px solid #ece7d8; }
.settings-bar__back { display: grid; width: 34px; height: 34px; padding: 0; color: #386641; background: none; border: 0; place-items: center; }
.settings-bar h1 { flex: 1; margin: 0; overflow: hidden; color: #386641; font-size: 18px; font-weight: 700; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
.settings-bar__spacer { width: 34px; }
.settings-scaffold__body { max-width: 600px; margin: auto; padding: 12px 16px 32px; }
</style>
