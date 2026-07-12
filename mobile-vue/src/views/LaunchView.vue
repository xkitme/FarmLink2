<template>
  <div class="launch">
    <!-- 广告大图：加载失败回落到内置渐变品牌屏 -->
    <div class="launch__bg">
      <img v-if="adImage" :src="adImage" alt="" class="launch__img" @error="adImage = ''" />
      <div class="launch__scrim"></div>
    </div>

    <!-- 品牌兜底（无广告图 / 加载中） -->
    <div v-if="!adImage" class="launch__brand">
      <div class="launch__logo"><van-icon name="flower-o" size="34" /></div>
      <h1>田园通</h1>
      <p>智慧乡村服务平台</p>
      <van-loading v-if="loading" color="#fff" size="22" class="launch__loading" />
    </div>

    <!-- 已登录看广告：右上角倒计时跳过 -->
    <button v-if="countingDown" type="button" class="launch__skip" @click="finish">
      {{ remaining }}秒 跳过 <van-icon name="arrow" size="14" />
    </button>

    <!-- 未登录：广告图作背景，服务协议同意门浮于其上 -->
    <LegalDialog
      :visible="showAgreement"
      :title="agreement.title"
      :sections="agreement.sections"
      consent-mode
      @agree="onAgree"
      @decline="onDecline"
    />

    <!-- 拒绝协议后的退出提示 -->
    <div v-if="exited" class="launch__exit">
      <p>您已退出田园通<br />请关闭当前页面</p>
    </div>
  </div>
</template>

<script>
import LegalDialog from '../components/LegalDialog.vue'
import { resolveImageUrl } from '../api/client'
import { SERVICE_AGREEMENT_TITLE, SERVICE_AGREEMENT_SECTIONS } from '../data/legal.js'

const AGREED_KEY = 'farmlink_agreed'

export default {
  name: 'LaunchView',
  components: { LegalDialog },
  data() {
    return {
      loading: true,
      adImage: '',
      targetPath: '/home',
      countingDown: false,
      remaining: 0,
      showAgreement: false,
      exited: false,
      _timer: null,
      _deadline: 0,
      agreement: { title: SERVICE_AGREEMENT_TITLE, sections: SERVICE_AGREEMENT_SECTIONS },
    }
  },
  computed: {
    isAuthenticated() {
      return this.$store.getters['auth/isAuthenticated']
    },
  },
  async created() {
    await this.$store.dispatch('auth/initialize')
    this.load()
  },
  beforeDestroy() {
    if (this._timer) window.clearInterval(this._timer)
  },
  methods: {
    async load() {
      let ad = {}
      try {
        // 2s 内没返回就直接进入下一步，避免首屏被广告接口拖住。
        ad = (await this.$api.get('/site/startup-ad', {}, { timeout: 2000 })) || {}
      } catch (_) {
        ad = {}
      }
      const enabled = ad.enabled !== false
      const image = String(ad.imageUrl || '').trim()
      const rawTarget = String(ad.targetPath || '/home').trim()
      this.targetPath = rawTarget.startsWith('/') ? rawTarget : '/home'
      this.loading = false

      if (!this.isAuthenticated) {
        // 未登录：广告图作背景，直接弹协议门（若已同意过则直接去登录）。
        if (image) this.adImage = resolveImageUrl(image)
        if (localStorage.getItem(AGREED_KEY) === '1') {
          this.$router.replace({ name: 'login' })
        } else {
          this.showAgreement = true
        }
        return
      }

      // 已登录：有广告图则倒计时展示，否则直接进首页。
      if (enabled && image) {
        this.adImage = resolveImageUrl(image)
        const durationMs = this.readDuration(ad)
        this.startCountdown(durationMs)
      } else {
        this.finish()
      }
    },
    readDuration(ad) {
      let ms = 5000
      if (typeof ad.durationMs === 'number') ms = ad.durationMs
      else if (typeof ad.durationSeconds === 'number') ms = ad.durationSeconds * 1000
      return Math.min(Math.max(ms, 1000), 15000)
    },
    startCountdown(durationMs) {
      this.countingDown = true
      this._deadline = Date.now() + durationMs
      this.tick()
      this._timer = window.setInterval(this.tick, 250)
    },
    tick() {
      const leftMs = this._deadline - Date.now()
      const next = leftMs <= 0 ? 0 : Math.ceil(leftMs / 1000)
      if (next !== this.remaining) this.remaining = next
      if (leftMs <= 0) this.finish()
    },
    finish() {
      if (this._timer) {
        window.clearInterval(this._timer)
        this._timer = null
      }
      this.countingDown = false
      const path = this.isAuthenticated ? this.targetPath : '/login'
      if (this.$route.path !== path) this.$router.replace(path)
    },
    onAgree() {
      localStorage.setItem(AGREED_KEY, '1')
      this.showAgreement = false
      this.$router.replace({ name: 'login' })
    },
    onDecline() {
      this.showAgreement = false
      this.exited = true
    },
  },
}
</script>

<style scoped>
.launch { position: fixed; inset: 0; overflow: hidden; background: #10211a; }
.launch__bg { position: absolute; inset: 0; }
.launch__img { width: 100%; height: 100%; object-fit: cover; }
.launch__scrim { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.4) 0%, rgba(0,0,0,.03) 48%, rgba(0,0,0,.6) 100%); }
.launch__brand { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; text-align: center; }
.launch__logo { display: grid; width: 76px; height: 76px; margin-bottom: 16px; color: #fff; background: rgba(255,255,255,.16); border: 1px solid rgba(255,255,255,.28); border-radius: 24px; place-items: center; }
.launch__brand h1 { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 3px; }
.launch__brand p { margin: 8px 0 0; font-size: 13px; color: rgba(255,255,255,.78); letter-spacing: 1px; }
.launch__loading { margin-top: 26px; }
.launch__skip { position: absolute; top: calc(14px + env(safe-area-inset-top)); right: 14px; z-index: 10; display: flex; align-items: center; gap: 5px; padding: 9px 16px; color: #fff; font-size: 14px; font-weight: 700; background: rgba(0,0,0,.55); border: 1.5px solid rgba(255,255,255,.6); border-radius: 999px; }
.launch__exit { position: absolute; inset: 0; z-index: 210; display: grid; place-items: center; padding: 28px; background: #10211a; }
.launch__exit p { margin: 0; font-size: 18px; font-weight: 600; line-height: 1.7; color: #fff; text-align: center; }
</style>
