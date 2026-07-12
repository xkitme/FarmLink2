<template>
  <div class="auth-page">
    <button class="back" type="button" aria-label="返回登录" @click="$router.replace({ name: 'login' })"><van-icon name="arrow-left" size="23" /></button>
    <section class="auth-card">
      <h1>创建账号</h1><p class="slogan">加入田园通，开启智慧乡村服务</p>
      <van-form class="auth-form" @submit="submit">
        <van-field v-model.trim="form.nickname" left-icon="contact" placeholder="昵称" :rules="[{ required: true, message: '请输入昵称' }]" />
        <van-field v-model.trim="form.username" left-icon="user-o" autocomplete="username" placeholder="手机号 / 用户名" :rules="[{ required: true, message: '请输入手机号/用户名' }]" />
        <van-field v-model.trim="form.phone" left-icon="phone-o" type="tel" maxlength="11" placeholder="手机号（用于找回密码）" :rules="phoneRules" />
        <van-field v-model="form.password" left-icon="bag-o" autocomplete="new-password" :type="showPassword ? 'text' : 'password'" placeholder="密码，至少 6 位" :rules="passwordRules"><template #button><van-icon :name="showPassword ? 'eye-o' : 'closed-eye'" @click="showPassword = !showPassword" /></template></van-field>
        <van-field v-model="confirmPassword" left-icon="passed" autocomplete="new-password" :type="showConfirm ? 'text' : 'password'" placeholder="确认密码" :rules="confirmRules"><template #button><van-icon :name="showConfirm ? 'eye-o' : 'closed-eye'" @click="showConfirm = !showConfirm" /></template></van-field>
        <p v-if="error" class="auth-error">{{ error }}</p>
        <van-button round block native-type="submit" :loading="loading" loading-text="创建中…" class="primary-button">创建账号</van-button>
      </van-form>
      <p class="auth-switch">已有账号？<router-link :to="{ name: 'login' }">返回登录</router-link></p>
    </section>
  </div>
</template>

<script>
export default {
  name: 'RegisterView',
  data() {
    return {
      form: { nickname: '', username: '', phone: '', password: '' }, confirmPassword: '', showPassword: false, showConfirm: false, loading: false, error: '',
      phoneRules: [{ required: true, message: '请输入手机号' }, { pattern: /^1\d{10}$/, message: '请输入正确的手机号' }],
      passwordRules: [{ required: true, message: '请输入密码' }, { validator: value => value.length >= 6, message: '密码至少 6 位' }],
      confirmRules: [{ required: true, message: '请再次输入密码' }, { validator: value => value === this.form.password, message: '两次输入的密码不一致' }]
    }
  },
  methods: {
    async submit() {
      this.loading = true; this.error = ''
      try { await this.$store.dispatch('auth/register', this.form); await this.$router.replace({ name: 'home' }) }
      catch (error) { this.error = (error && (error.message || error.msg)) || '注册暂时不可用，请稍后重试' }
      finally { this.loading = false }
    }
  }
}
</script>

<style scoped>
.auth-page { position:relative; display:grid; min-height:100vh; padding:68px 22px 28px; color:#fff; background:linear-gradient(155deg,#173f32,#386641 55%,#1e5544); box-sizing:border-box; place-items:center; }
.back { position:fixed; top:calc(16px + env(safe-area-inset-top)); left:16px; z-index:2; display:grid; width:40px; height:40px; padding:0; color:#fff; background:rgba(255,255,255,.13); border:1px solid rgba(255,255,255,.2); border-radius:50%; place-items:center; }
.auth-card { width:min(100%,400px); padding:26px 22px 22px; text-align:center; background:rgba(8,43,33,.32); border:1px solid rgba(255,255,255,.16); border-radius:28px; box-shadow:0 22px 60px rgba(8,27,20,.24); backdrop-filter:blur(12px); box-sizing:border-box; }
h1 { margin:0; font-size:27px; letter-spacing:2px; } .slogan { margin:8px 0 22px; color:rgba(255,255,255,.75); font-size:13px; }
.auth-form { display:grid; gap:12px; } .auth-form :deep(.van-cell) { padding:12px 15px; background:rgba(255,255,255,.95); border-radius:13px; } .auth-form :deep(.van-cell::after) { display:none; }
.auth-error { margin:0; color:#ffd9d9; font-size:13px; font-weight:700; }.primary-button { color:#fff; font-weight:800; background:linear-gradient(135deg,#5ed09b,#1e7f61); border:0; }.auth-switch { margin:16px 0 0; color:rgba(255,255,255,.72); font-size:13px; }.auth-switch a { color:#d3ffe0; font-weight:800; }
</style>
