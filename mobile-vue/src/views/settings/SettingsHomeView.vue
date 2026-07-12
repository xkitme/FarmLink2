<template>
  <SettingsScaffold title="设置" fallback="/profile">
    <p class="group-label">账号与安全</p>
    <div class="card">
      <button type="button" class="tile tile--profile" @click="go('/profile/settings/account')">
        <span class="tile__avatar">{{ initial }}</span>
        <span class="tile__main"><em>{{ name }}</em><small>个人资料</small></span>
        <van-icon name="arrow" size="15" color="#c3bba6" />
      </button>
      <div class="divider"></div>
      <SettingRow icon="phone-o" label="手机号绑定" :value="maskedPhone" @click="go('/profile/settings/account')" />
      <div class="divider"></div>
      <SettingRow icon="lock" label="修改密码" @click="go('/profile/settings/password')" />
    </div>

    <p class="group-label">通知与通用</p>
    <div class="card">
      <SettingRow icon="bell" label="消息推送设置" @click="go('/profile/settings/push')" />
      <div class="divider"></div>
      <SettingRow icon="underway-o" label="气象预警提醒" @click="go('/profile/settings/weather')" />
      <div class="divider"></div>
      <SettingRow icon="friends-o" label="适老模式" subtitle="放大字号、朗读 AI 回答，方便长辈使用" @click="go('/profile/settings/elder')" />
      <div class="divider"></div>
      <SettingRow icon="volume-o" label="语音唤醒" subtitle="说「你好小田」呼叫唤起 AI 语音助手" @click="go('/profile/settings/wake')" />
      <div class="divider"></div>
      <SettingRow icon="font-o" label="语言设置" value="简体中文" @click="toastLang" />
      <div class="divider"></div>
      <SettingRow icon="cluster-o" label="存储空间管理" @click="go('/profile/settings/storage')" />
    </div>

    <p class="group-label">隐私与支持</p>
    <div class="card">
      <SettingRow icon="shield-o" label="隐私设置" @click="go('/profile/settings/privacy')" />
      <div class="divider"></div>
      <SettingRow icon="delete-o" label="清除缓存" value="清理" @click="clearCache" />
      <div class="divider"></div>
      <SettingRow icon="question-o" label="帮助与反馈" @click="go('/profile/settings/help')" />
      <div class="divider"></div>
      <SettingRow icon="info-o" label="关于田园通" :value="'v' + appVersion" @click="go('/profile/settings/about')" />
    </div>

    <van-button plain round block color="#ba1a1a" class="logout" :loading="loggingOut" @click="logout">退出登录</van-button>
    <p class="slogan">{{ slogan }}</p>
  </SettingsScaffold>
</template>

<script>
import SettingsScaffold from '../../components/SettingsScaffold.vue'
import SettingRow from '../../components/SettingRow.vue'
import { APP_VERSION, APP_SLOGAN } from '../../data/app.js'

export default {
  name: 'SettingsHomeView',
  components: { SettingsScaffold, SettingRow },
  data() {
    return { loggingOut: false, appVersion: APP_VERSION, slogan: APP_SLOGAN }
  },
  computed: {
    user() { return (this.$store.state.auth && this.$store.state.auth.user) || {} },
    name() { return this.user.nickname || this.user.username || '未登录' },
    initial() { return this.name.slice(0, 1) },
    maskedPhone() {
      const phone = this.user.phone
      if (!phone || phone.length < 7) return '未绑定'
      return `${phone.slice(0, 3)}****${phone.slice(-4)}`
    },
  },
  methods: {
    go(route) { this.$router.push(route) },
    toastLang() { this.$toast('当前仅支持简体中文') },
    clearCache() {
      let count = 0
      try {
        const keys = Object.keys(localStorage).filter((k) => k.startsWith('cache:'))
        keys.forEach((k) => { localStorage.removeItem(k); count += 1 })
      } catch (_) { /* ignore */ }
      this.$toast(`缓存已清理（${count} 项）`)
    },
    async logout() {
      this.loggingOut = true
      try {
        await this.$store.dispatch('auth/logout')
        await this.$router.replace({ name: 'login' })
      } finally {
        this.loggingOut = false
      }
    },
  },
}
</script>

<style scoped>
.group-label { margin: 16px 4px 8px; color: #8d816b; font-size: 12px; font-weight: 700; }
.card { overflow: hidden; background: #fff; border: 1px solid #e5dfce; border-radius: 16px; }
.divider { height: 1px; margin-left: 52px; background: #f0ecde; }
.tile { display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px; background: none; border: 0; text-align: left; }
.tile__avatar { display: grid; width: 44px; height: 44px; color: #386641; background: #e3f0e6; border-radius: 50%; place-items: center; font-size: 18px; font-weight: 800; }
.tile__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.tile__main em { color: #2f3a30; font-size: 16px; font-weight: 700; font-style: normal; }
.tile__main small { color: #827966; font-size: 12px; }
.logout { margin-top: 26px; background: rgba(255,255,255,.7); }
.slogan { margin: 16px 0 0; color: #a79f8c; font-size: 12px; text-align: center; }
</style>
