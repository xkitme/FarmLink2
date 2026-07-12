<template>
  <SubPage title="记一笔农事" fallback="/agri">
    <div class="form">
      <div class="field">
        <label>农事类型 <i>*</i></label>
        <div class="chips">
          <button v-for="t in types" :key="t" type="button" :class="{ active: form.recordType === t }" @click="form.recordType = t">{{ t }}</button>
        </div>
      </div>

      <div class="field">
        <label>地块</label>
        <div class="chips">
          <button v-for="p in plots" :key="p.id" type="button" :class="{ active: form.plotId === p.id }" @click="selectPlot(p)">{{ p.plotName }}</button>
          <span v-if="!plots.length" class="hint">暂无地块，可先不选</span>
        </div>
      </div>

      <div class="field">
        <label>作物</label>
        <input v-model="form.cropType" type="text" placeholder="如 柑橘 / 水稻" />
      </div>

      <div class="field">
        <label>农事内容</label>
        <textarea v-model="form.content" rows="3" placeholder="记录今天做了什么、观察到什么…"></textarea>
      </div>

      <div class="field field--row">
        <div>
          <label>成本（元）</label>
          <input v-model="form.cost" type="number" inputmode="decimal" placeholder="0" />
        </div>
        <div>
          <label>日期</label>
          <input v-model="form.recordDate" type="date" />
        </div>
      </div>

      <div class="field">
        <label>现场照片</label>
        <ImageUploader v-model="form.images" :max="6" />
      </div>

      <button type="button" class="submit" :disabled="submitting || !form.recordType" @click="submit">
        <van-loading v-if="submitting" size="18" color="#fff" />
        <span v-else>保存农事记录</span>
      </button>
    </div>
  </SubPage>
</template>

<script>
import SubPage from '../components/SubPage.vue'
import ImageUploader from '../components/ImageUploader.vue'

function payload(res) {
  const v = res && res.data !== undefined ? res.data : res
  return v && v.data !== undefined ? v.data : (v || {})
}
function today() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default {
  name: 'RecordCreateView',
  components: { SubPage, ImageUploader },
  data() {
    return {
      types: ['播种', '施肥', '打药', '巡田', '灌溉', '修剪', '采收', '收获'],
      plots: [],
      submitting: false,
      form: { recordType: '', plotId: null, cropType: '', content: '', cost: '', recordDate: today(), images: [] },
    }
  },
  created() { this.loadPlots() },
  methods: {
    async loadPlots() {
      try {
        const list = payload(await this.$api.get('/agri/plot/list'))
        this.plots = Array.isArray(list) ? list : (list.records || [])
      } catch (_) { /* 允许无地块 */ }
    },
    selectPlot(p) {
      this.form.plotId = this.form.plotId === p.id ? null : p.id
      if (this.form.plotId && !this.form.cropType) this.form.cropType = p.cropType || ''
    },
    async submit() {
      if (!this.form.recordType) {
        this.$toast('请选择农事类型')
        return
      }
      this.submitting = true
      try {
        const body = {
          recordType: this.form.recordType,
          plotId: this.form.plotId || undefined,
          cropType: this.form.cropType || undefined,
          content: this.form.content || undefined,
          cost: this.form.cost ? Number(this.form.cost) : undefined,
          images: this.form.images,
          recordDate: this.form.recordDate ? new Date(this.form.recordDate).toISOString() : undefined,
        }
        await this.$api.post('/agri/record', body)
        this.$toast.success('已保存')
        setTimeout(() => {
          if (window.history.length > 1) this.$router.back()
          else this.$router.replace('/agri')
        }, 600)
      } catch (err) {
        this.$toast((err && err.message) || '保存失败，请重试')
      } finally {
        this.submitting = false
      }
    },
  },
}
</script>

<style scoped>
.form { padding-bottom: 20px; }
.field { margin-bottom: 18px; }
.field label { display: block; margin-bottom: 9px; color: #4e554c; font-size: 13px; font-weight: 600; }
.field label i { color: #ba1a1a; font-style: normal; }
.field input, .field textarea { width: 100%; padding: 11px 13px; color: #2f3a30; font-size: 14px; background: #fff; border: 1px solid #e5dfce; border-radius: 10px; box-sizing: border-box; }
.field input:focus, .field textarea:focus { border-color: #52b788; outline: none; }
.field textarea { resize: none; line-height: 1.6; }
.field--row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chips button { padding: 8px 14px; color: #4e554c; font-size: 13px; background: #fff; border: 1px solid #e5dfce; border-radius: 999px; }
.chips button.active { color: #fff; font-weight: 700; background: #386641; border-color: #386641; }
.hint { color: #a79f8c; font-size: 12px; align-self: center; }
.submit { display: flex; align-items: center; justify-content: center; width: 100%; height: 50px; margin-top: 6px; color: #fff; font-size: 15px; font-weight: 700; background: linear-gradient(135deg, #3e6b4f, #52b788); border: 0; border-radius: 14px; box-shadow: 0 8px 18px rgba(45,106,79,.25); }
.submit:disabled { opacity: .55; }
</style>
