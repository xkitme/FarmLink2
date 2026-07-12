<template>
  <SettingsScaffold title="关于田园通" fallback="/profile/settings">
    <section class="brand">
      <div class="brand__logo"><van-icon name="flower-o" size="30" /></div>
      <h1>{{ appName }}</h1>
      <p class="brand__version">版本 v{{ appVersion }}</p>
      <p class="brand__desc">数字乡村助农平台，覆盖农业生产、流通销售、农机共享、气象灾害、惠农政策、乡村生活与数据管理等核心业务链路。</p>
    </section>

    <div class="mission">
      <h2>我们的使命</h2>
      <p>用农业技术连接每一寸土地，让田间管理、产销对接与惠农服务一站直达。</p>
    </div>

    <p class="group-label">条款与支持</p>
    <div class="card">
      <SettingRow icon="description" label="服务协议" @click="go('/profile/settings/agreement')" />
      <div class="divider"></div>
      <SettingRow icon="shield-o" label="隐私政策" @click="go('/profile/settings/privacy')" />
      <div class="divider"></div>
      <SettingRow icon="question-o" label="帮助与反馈" @click="go('/profile/settings/help')" />
    </div>

    <p class="footer">© 2026 {{ appName }} · {{ slogan }}</p>
  </SettingsScaffold>
</template>

<script>
import SettingsScaffold from '../../components/SettingsScaffold.vue'
import SettingRow from '../../components/SettingRow.vue'
import { APP_VERSION, APP_NAME, APP_SLOGAN } from '../../data/app.js'

export default {
  name: 'AboutView',
  components: { SettingsScaffold, SettingRow },
  data() {
    return { appVersion: APP_VERSION, appName: APP_NAME, slogan: APP_SLOGAN }
  },
  methods: {
    go(route) { this.$router.push(route) },
  },
}
</script>

<style scoped>
.brand { padding: 22px 20px; margin-bottom: 14px; color: #fff; text-align: center; background: linear-gradient(140deg, #305f43, #52b788); border-radius: 20px; box-shadow: 0 12px 28px rgba(48, 95, 67, .22); }
.brand__logo { display: inline-grid; width: 62px; height: 62px; margin-bottom: 12px; background: rgba(255,255,255,.18); border: 1px solid rgba(255,255,255,.3); border-radius: 20px; place-items: center; }
.brand h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 2px; }
.brand__version { margin: 6px 0 0; color: rgba(255,255,255,.8); font-size: 12px; }
.brand__desc { margin: 12px 0 0; color: rgba(255,255,255,.9); font-size: 13px; line-height: 1.7; }
.mission { padding: 16px 18px; margin-bottom: 6px; background: #fff; border: 1px solid #e5dfce; border-radius: 16px; }
.mission h2 { margin: 0 0 8px; color: #2f3a30; font-size: 15px; font-weight: 700; }
.mission p { margin: 0; color: #4e554c; font-size: 13px; line-height: 1.7; }
.group-label { margin: 16px 4px 8px; color: #8d816b; font-size: 12px; font-weight: 700; }
.card { overflow: hidden; background: #fff; border: 1px solid #e5dfce; border-radius: 16px; }
.divider { height: 1px; margin-left: 52px; background: #f0ecde; }
.footer { margin: 24px 0 0; color: #a79f8c; font-size: 12px; text-align: center; }
</style>
