<template>
  <div class="auth-page">
    <div class="auth-page__veil" />
    <section class="auth-card">
      <div class="brand-icon"><van-icon name="cluster-o" size="30" /></div>
      <h1>田园通</h1>
      <p class="slogan">每一次绿色选择，都在为乡村成长赋能</p>
      <van-form class="auth-form" @submit="submit">
        <van-field v-model.trim="form.username" name="username" left-icon="user-o" autocomplete="username"
          placeholder="手机号 / 用户名" :rules="[{ required: true, message: '请输入手机号/用户名' }]" />
        <van-field v-model="form.password" name="password" left-icon="bag-o" autocomplete="current-password"
          :type="showPassword ? 'text' : 'password'" placeholder="密码" :rules="[{ required: true, message: '请输入密码' }]">
          <template #button><van-icon :name="showPassword ? 'eye-o' : 'closed-eye'" size="19" @click="showPassword = !showPassword" /></template>
        </van-field>
        <div class="auth-options">
          <van-checkbox v-model="agreed" icon-size="17px">已阅读并同意<span class="link">《用户协议》</span>与<span class="link">《隐私政策》</span></van-checkbox>
          <router-link :to="{ name: 'forgot' }">忘记密码？</router-link>
        </div>
        <p v-if="error" class="auth-error" role="alert">{{ error }}</p>
        <van-button round block native-type="submit" :loading="loading" loading-text="登录中…" class="primary-button">登录</van-button>
      </van-form>
      <p class="auth-switch">还没有账号？<router-link :to="{ name: 'register' }">立即注册</router-link></p>
    </section>
  </div>
</template>

<script>
export default {
  name: 'LoginView',
  data: () => ({ form: { username: '', password: '' }, agreed: false, showPassword: false, loading: false, error: '' }),
  methods: {
    async submit() {
      if (!this.agreed) { this.error = '请先阅读并勾选同意《用户协议》与《隐私政策》'; return }
      this.loading = true; this.error = ''
      try {
        await this.$store.dispatch('auth/login', this.form)
        await this.$router.replace({ name: 'home' })
      } catch (error) {
        this.error = (error && (error.message || error.msg)) || '登录暂时不可用，请稍后重试'
      } finally { this.loading = false }
    }
  }
}
</script>

<style scoped>
.auth-page { position: relative; display: grid; min-height: 100vh; overflow: hidden; place-items: center; padding: 30px 22px; color: #fff; background: linear-gradient(155deg,#173f32 0%,#386641 52%,#1e5544 100%); box-sizing: border-box; }
.auth-page::before,.auth-page::after { position: absolute; content: ''; border-radius: 50%; filter: blur(2px); }
.auth-page::before { top: -90px; right: -100px; width: 300px; height: 300px; background: rgba(94,208,155,.18); }
.auth-page::after { bottom: -130px; left: -100px; width: 330px; height: 330px; background: rgba(221,161,94,.14); }
.auth-page__veil { position: absolute; inset: 0; opacity: .18; background-image: radial-gradient(circle at 20% 30%,#fff 0 1px,transparent 2px),radial-gradient(circle at 75% 65%,#fff 0 1px,transparent 2px); background-size: 52px 52px,68px 68px; }
.auth-card { position: relative; z-index: 1; width: min(100%,400px); padding: 28px 22px 24px; text-align: center; background: rgba(8,43,33,.32); border: 1px solid rgba(255,255,255,.16); border-radius: 28px; box-shadow: 0 22px 60px rgba(8,27,20,.24); backdrop-filter: blur(12px); box-sizing: border-box; }
.brand-icon { display: grid; width: 58px; height: 58px; margin: 0 auto 13px; place-items: center; background: linear-gradient(145deg,#67d7a3,#2a8a68); border: 1px solid rgba(255,255,255,.45); border-radius: 20px; box-shadow: 0 9px 24px rgba(10,50,37,.35); }
h1 { margin: 0; font-size: 31px; letter-spacing: 4px; } .slogan { margin: 8px 0 26px; color: rgba(255,255,255,.78); font-size: 13px; }
.auth-form { display: grid; gap: 14px; } .auth-form :deep(.van-cell) { padding: 13px 16px; background: rgba(255,255,255,.94); border-radius: 14px; } .auth-form :deep(.van-cell::after) { display:none; }
.auth-options { display:flex; gap:8px; align-items:flex-start; justify-content:space-between; color:rgba(255,255,255,.82); font-size:11px; text-align:left; } .auth-options :deep(.van-checkbox__label) { color:inherit; margin-left:5px; line-height:1.5; } .auth-options a,.link,.auth-switch a { color:#d3ffe0; font-weight:800; white-space:nowrap; }
.auth-error { margin: -3px 0 0; color:#ffd9d9; font-size:13px; font-weight:700; }
.primary-button { color:#fff; font-weight:800; background:linear-gradient(135deg,#5ed09b,#1e7f61); border:0; box-shadow:0 8px 22px rgba(11,55,41,.3); }
.auth-switch { margin:18px 0 0; color:rgba(255,255,255,.72); font-size:13px; }
</style>
