<template>
  <SubPage title="农机详情" fallback="/machinery" flush>
    <div v-if="loading" class="state"><van-loading size="22">加载中…</van-loading></div>
    <div v-else-if="error" class="state">
      <van-icon name="warning-o" size="30" color="#c3bba6" />
      <p>加载失败</p>
      <van-button size="small" plain color="#386641" @click="load">重试</van-button>
    </div>
    <template v-else>
      <div class="gallery">
        <img v-if="cover" :src="cover" alt="" @error="broken = true" />
        <span v-else class="gallery__ph"><van-icon name="logistics" size="46" /></span>
      </div>

      <div class="section head">
        <div class="head__top">
          <h1>{{ m.machineName }}</h1>
          <span class="rating"><van-icon name="star" size="14" /> {{ m.rating || '—' }}</span>
        </div>
        <span class="tag">{{ m.machineType }}</span>
        <div class="price"><b>￥{{ m.dailyPrice }}</b><i>/天</i><span>押金 ￥{{ m.deposit || 0 }} · 累计作业 {{ m.totalHours || 0 }}h</span></div>
      </div>

      <div class="section">
        <h2>设备介绍</h2>
        <p class="desc">{{ m.description || '暂无介绍。' }}</p>
      </div>

      <div v-if="m.owner" class="section owner">
        <h2>机主</h2>
        <div class="owner__row">
          <span class="owner__avatar">{{ (m.owner.nickname || '机')[0] }}</span>
          <div><em>{{ m.owner.nickname || '机主' }}</em><small>{{ m.owner.villageName || '本地机手' }}</small></div>
        </div>
      </div>

      <div class="book-bar">
        <div class="book-bar__price"><b>￥{{ m.dailyPrice }}</b><i>/天</i></div>
        <button type="button" class="book-bar__btn" @click="showBook = true">立即预约</button>
      </div>

      <van-popup v-model="showBook" round position="bottom">
        <div class="book-form">
          <div class="book-form__head"><h3>预约 {{ m.machineName }}</h3><button type="button" @click="showBook = false"><van-icon name="cross" size="18" /></button></div>
          <div class="bf-field">
            <label>开始日期</label>
            <input v-model="booking.startDate" type="date" :min="todayStr" />
          </div>
          <div class="bf-field">
            <label>结束日期</label>
            <input v-model="booking.endDate" type="date" :min="booking.startDate || todayStr" />
          </div>
          <div class="bf-field">
            <label>备注</label>
            <textarea v-model="booking.remark" rows="2" placeholder="作业地块、面积或其他需求…"></textarea>
          </div>
          <div class="bf-total" v-if="days > 0">共 {{ days }} 天 · 预估 <b>￥{{ days * (m.dailyPrice || 0) }}</b></div>
          <button type="button" class="bf-submit" :disabled="submitting || !canSubmit" @click="submit">
            <van-loading v-if="submitting" size="18" color="#fff" />
            <span v-else>确认预约</span>
          </button>
        </div>
      </van-popup>
    </template>
  </SubPage>
</template>

<script>
import SubPage from '../components/SubPage.vue'
import { resolveImageUrl } from '../api/client'

function payload(res) {
  const v = res && res.data !== undefined ? res.data : res
  return v && v.data !== undefined ? v.data : (v || {})
}
function ymd(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export default {
  name: 'MachineryDetailView',
  components: { SubPage },
  data() {
    return { m: {}, loading: true, error: false, broken: false, showBook: false, submitting: false, booking: { startDate: '', endDate: '', remark: '' } }
  },
  computed: {
    cover() {
      if (this.broken) return ''
      const img = (this.m.images || [])[0]
      return img ? resolveImageUrl(img) : ''
    },
    todayStr() { return ymd(new Date()) },
    days() {
      if (!this.booking.startDate || !this.booking.endDate) return 0
      const s = new Date(this.booking.startDate)
      const e = new Date(this.booking.endDate)
      const diff = Math.round((e - s) / 86400000) + 1
      return diff > 0 ? diff : 0
    },
    canSubmit() { return this.booking.startDate && this.booking.endDate && this.days > 0 },
  },
  created() { this.load() },
  methods: {
    async load() {
      this.loading = true
      this.error = false
      try {
        this.m = payload(await this.$api.get('/machinery/' + this.$route.params.id))
      } catch (_) {
        this.error = true
      } finally {
        this.loading = false
      }
    },
    async submit() {
      if (!this.canSubmit) {
        this.$toast('请选择正确的起止日期')
        return
      }
      this.submitting = true
      try {
        await this.$api.post('/machinery/booking', {
          machineryId: this.m.id,
          startDate: new Date(this.booking.startDate).toISOString(),
          endDate: new Date(this.booking.endDate).toISOString(),
          remark: this.booking.remark || undefined,
        })
        this.showBook = false
        this.$toast.success('预约已提交')
        setTimeout(() => this.$router.push('/machinery/bookings'), 700)
      } catch (err) {
        this.$toast((err && err.message) || '预约失败，请重试')
      } finally {
        this.submitting = false
      }
    },
  },
}
</script>

<style scoped>
.state { display: grid; gap: 12px; padding: 60px 0; place-items: center; color: #827966; }
.gallery { width: 100%; height: 240px; background: #eef0e9; }
.gallery img { width: 100%; height: 100%; object-fit: cover; }
.gallery__ph { display: grid; width: 100%; height: 100%; color: #9db5a3; background: linear-gradient(135deg, #e2f0ee, #d5e8e4); place-items: center; }
.section { margin: 10px 12px 0; padding: 16px; background: #fff; border: 1px solid #e5dfce; border-radius: 16px; }
.section h2 { margin: 0 0 10px; font-size: 15px; font-weight: 700; color: #2f3a30; }
.head { margin-top: -20px; position: relative; z-index: 2; }
.head__top { display: flex; align-items: center; justify-content: space-between; }
.head h1 { margin: 0; font-size: 19px; font-weight: 800; color: #2f3a30; }
.rating { display: inline-flex; align-items: center; gap: 3px; color: #dda15e; font-size: 13px; font-weight: 700; }
.tag { display: inline-block; margin-top: 8px; padding: 4px 10px; color: #2e6e66; font-size: 12px; background: #e2f0ee; border-radius: 7px; }
.price { display: flex; align-items: baseline; gap: 6px; margin-top: 12px; }
.price b { color: #ba1a1a; font-size: 24px; font-weight: 800; }
.price i { color: #a79f8c; font-size: 13px; font-style: normal; }
.price span { margin-left: auto; color: #a79f8c; font-size: 11px; }
.desc { margin: 0; color: #4e554c; font-size: 14px; line-height: 1.8; }
.owner__row { display: flex; align-items: center; gap: 12px; }
.owner__avatar { display: grid; width: 44px; height: 44px; color: #2e6e66; font-size: 18px; font-weight: 800; background: #e2f0ee; border-radius: 50%; place-items: center; }
.owner__row em { font-style: normal; font-weight: 700; font-size: 15px; color: #2f3a30; }
.owner__row small { display: block; margin-top: 2px; color: #a79f8c; font-size: 12px; }
.book-bar { position: sticky; bottom: 0; display: flex; align-items: center; gap: 14px; margin-top: 12px; padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #ece7d8; }
.book-bar__price { flex: 1; }
.book-bar__price b { color: #ba1a1a; font-size: 20px; font-weight: 800; }
.book-bar__price i { color: #a79f8c; font-size: 12px; font-style: normal; }
.book-bar__btn { padding: 0 30px; height: 46px; color: #fff; font-size: 15px; font-weight: 700; background: linear-gradient(135deg, #3e6b4f, #52b788); border: 0; border-radius: 999px; box-shadow: 0 8px 18px rgba(45,106,79,.28); }
.book-form { padding: 18px 18px calc(20px + env(safe-area-inset-bottom)); }
.book-form__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.book-form__head h3 { margin: 0; font-size: 16px; font-weight: 700; color: #2f3a30; }
.book-form__head button { padding: 0; color: #a79f8c; background: none; border: 0; }
.bf-field { margin-bottom: 14px; }
.bf-field label { display: block; margin-bottom: 7px; color: #4e554c; font-size: 13px; font-weight: 600; }
.bf-field input, .bf-field textarea { width: 100%; padding: 11px 13px; font-size: 14px; color: #2f3a30; background: #f7f8f5; border: 1px solid #e5dfce; border-radius: 10px; box-sizing: border-box; }
.bf-field textarea { resize: none; }
.bf-total { margin: 4px 0 14px; color: #4e554c; font-size: 14px; }
.bf-total b { color: #ba1a1a; font-size: 18px; }
.bf-submit { display: flex; align-items: center; justify-content: center; width: 100%; height: 48px; color: #fff; font-size: 15px; font-weight: 700; background: linear-gradient(135deg, #3e6b4f, #52b788); border: 0; border-radius: 12px; }
.bf-submit:disabled { opacity: .55; }
</style>
