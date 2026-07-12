<template>
  <SubPage title="气象灾害" fallback="/home">
    <!-- 预警 -->
    <section class="alerts">
      <template v-if="alerts.length">
        <div v-for="(a, i) in alerts" :key="i" class="alert">
          <van-icon name="warning" size="18" />
          <div><em>{{ a.title || a.type || '气象预警' }}</em><p>{{ a.content || a.description }}</p></div>
        </div>
      </template>
      <div v-else class="alert alert--ok">
        <van-icon name="checked" size="18" />
        <div><em>当前无生效预警</em><p>本区域暂无气象灾害预警，注意关注天气变化。</p></div>
      </div>
    </section>

    <!-- 快捷 -->
    <section class="actions">
      <button type="button" class="act act--report" @click="openReport"><van-icon name="edit" size="24" /><span>灾情上报</span></button>
      <button type="button" class="act act--sos" @click="showSos = true"><van-icon name="phone-o" size="24" /><span>紧急求助</span></button>
    </section>

    <!-- 我的上报 -->
    <section class="block">
      <h2>我的灾情上报</h2>
      <div v-if="loading" class="state"><van-loading size="20" /></div>
      <template v-else>
        <div v-for="r in reports" :key="r.id" class="report">
          <div class="report__head">
            <span class="report__type">{{ r.disasterType }}</span>
            <span class="report__status" :style="{ color: statusMeta(r.status).color, backgroundColor: statusMeta(r.status).bg }">{{ statusMeta(r.status).label }}</span>
          </div>
          <p class="report__desc">{{ r.description }}</p>
          <div class="report__meta">
            <span v-if="r.affectedArea">受灾 {{ r.affectedArea }} 亩</span>
            <span v-if="r.estimatedLoss">预估损失 ￥{{ r.estimatedLoss }}</span>
            <span v-if="r.aiLossLevel" class="report__level">AI 定损 {{ r.aiLossLevel }}</span>
          </div>
        </div>
        <van-empty v-if="!reports.length" description="暂无灾情上报" />
      </template>
    </section>

    <!-- 灾情上报弹层 -->
    <van-popup v-model="showReport" round position="bottom">
      <div class="sheet">
        <div class="sheet__head"><h3>灾情上报</h3><button type="button" @click="showReport = false"><van-icon name="cross" size="18" /></button></div>
        <div class="sf">
          <label>灾害类型 <i>*</i></label>
          <div class="chips"><button v-for="t in disasterTypes" :key="t" type="button" :class="{ active: report.disasterType === t }" @click="report.disasterType = t">{{ t }}</button></div>
        </div>
        <div class="sf" v-if="plots.length">
          <label>受灾地块</label>
          <div class="chips"><button v-for="p in plots" :key="p.id" type="button" :class="{ active: report.plotId === p.id }" @click="report.plotId = report.plotId === p.id ? null : p.id">{{ p.plotName }}</button></div>
        </div>
        <div class="sf sf--row">
          <div><label>受灾面积（亩）</label><input v-model="report.affectedArea" type="number" inputmode="decimal" placeholder="0" /></div>
          <div><label>预估损失（元）</label><input v-model="report.estimatedLoss" type="number" inputmode="decimal" placeholder="0" /></div>
        </div>
        <div class="sf"><label>灾情描述</label><textarea v-model="report.description" rows="2" placeholder="受灾时间、范围与情况…"></textarea></div>
        <div class="sf"><label>现场照片</label><ImageUploader v-model="report.images" :max="6" /></div>
        <button type="button" class="submit" :disabled="reporting || !report.disasterType" @click="submitReport">
          <van-loading v-if="reporting" size="18" color="#fff" /><span v-else>提交上报</span>
        </button>
      </div>
    </van-popup>

    <!-- 紧急求助弹层 -->
    <van-popup v-model="showSos" round position="bottom">
      <div class="sheet">
        <div class="sheet__head"><h3>紧急求助</h3><button type="button" @click="showSos = false"><van-icon name="cross" size="18" /></button></div>
        <div class="sf">
          <label>求助类型 <i>*</i></label>
          <div class="chips"><button v-for="t in sosTypes" :key="t" type="button" :class="{ active: sos.sosType === t }" @click="sos.sosType = t">{{ t }}</button></div>
        </div>
        <div class="sf"><label>联系电话</label><input v-model="sos.contactPhone" type="tel" inputmode="tel" placeholder="便于救援联系" /></div>
        <div class="sf"><label>情况说明</label><textarea v-model="sos.description" rows="2" placeholder="所在位置与需要的帮助…"></textarea></div>
        <button type="button" class="submit submit--sos" :disabled="sosing || !sos.sosType" @click="submitSos">
          <van-loading v-if="sosing" size="18" color="#fff" /><span v-else>发送求助</span>
        </button>
      </div>
    </van-popup>
  </SubPage>
</template>

<script>
import SubPage from '../components/SubPage.vue'
import ImageUploader from '../components/ImageUploader.vue'

function payload(res) {
  const v = res && res.data !== undefined ? res.data : res
  return v && v.data !== undefined ? v.data : (v || {})
}
const RSTATUS = {
  REPORTED: { label: '已上报', color: '#9a6a24', bg: '#f8eddc' },
  PENDING: { label: '待处理', color: '#9a6a24', bg: '#f8eddc' },
  PROCESSING: { label: '处理中', color: '#2e6e66', bg: '#e2f0ee' },
  PROCESSED: { label: '已处理', color: '#386641', bg: '#e7f1e7' },
  CLOSED: { label: '已关闭', color: '#8d816b', bg: '#efeade' },
}

export default {
  name: 'DisasterView',
  components: { SubPage, ImageUploader },
  data() {
    return {
      alerts: [], reports: [], plots: [], loading: true,
      disasterTypes: ['暴雨', '冰雹', '干旱', '霜冻', '大风', '病虫害'],
      sosTypes: ['医疗急救', '洪涝水灾', '火灾', '人员走失', '其他'],
      showReport: false, showSos: false, reporting: false, sosing: false,
      report: { disasterType: '', plotId: null, affectedArea: '', estimatedLoss: '', description: '', images: [] },
      sos: { sosType: '', contactPhone: '', description: '' },
    }
  },
  created() { this.load() },
  methods: {
    statusMeta(s) { return RSTATUS[s] || { label: s || '处理中', color: '#526258', bg: '#e9ece9' } },
    async load() {
      this.loading = true
      const [a, r, p] = await Promise.allSettled([
        this.$api.get('/disaster/alert/list'),
        this.$api.get('/disaster/report/list'),
        this.$api.get('/agri/plot/list'),
      ])
      if (a.status === 'fulfilled') { const d = payload(a.value); this.alerts = Array.isArray(d) ? d : (d.records || []) }
      if (r.status === 'fulfilled') { const d = payload(r.value); this.reports = d.records || d.list || [] }
      if (p.status === 'fulfilled') { const d = payload(p.value); this.plots = Array.isArray(d) ? d : (d.records || []) }
      this.loading = false
    },
    openReport() {
      this.report = { disasterType: '', plotId: null, affectedArea: '', estimatedLoss: '', description: '', images: [] }
      this.showReport = true
    },
    async submitReport() {
      if (!this.report.disasterType) { this.$toast('请选择灾害类型'); return }
      this.reporting = true
      try {
        await this.$api.post('/disaster/report', {
          disasterType: this.report.disasterType,
          plotId: this.report.plotId || undefined,
          affectedArea: this.report.affectedArea ? Number(this.report.affectedArea) : undefined,
          estimatedLoss: this.report.estimatedLoss ? Number(this.report.estimatedLoss) : undefined,
          description: this.report.description || undefined,
          images: this.report.images,
        })
        this.showReport = false
        this.$toast.success('上报成功')
        this.load()
      } catch (err) {
        this.$toast((err && err.message) || '上报失败，请重试')
      } finally {
        this.reporting = false
      }
    },
    async submitSos() {
      if (!this.sos.sosType) { this.$toast('请选择求助类型'); return }
      this.sosing = true
      try {
        await this.$api.post('/disaster/sos', {
          sosType: this.sos.sosType,
          contactPhone: this.sos.contactPhone || undefined,
          description: this.sos.description || undefined,
        })
        this.showSos = false
        this.$toast.success('求助已发送，请保持电话畅通')
        this.sos = { sosType: '', contactPhone: '', description: '' }
      } catch (err) {
        this.$toast((err && err.message) || '发送失败，请重试')
      } finally {
        this.sosing = false
      }
    },
  },
}
</script>

<style scoped>
.alerts { margin-bottom: 14px; }
.alert { display: flex; gap: 10px; padding: 14px; background: #fbe7e5; border: 1px solid #f3c9c3; border-radius: 14px; color: #ba1a1a; }
.alert--ok { background: #e7f1e7; border-color: #d6e6d8; color: #386641; }
.alert em { font-style: normal; font-weight: 700; font-size: 14px; }
.alert p { margin: 4px 0 0; font-size: 12px; line-height: 1.5; opacity: .9; }
.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
.act { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 18px 0; font-size: 14px; font-weight: 700; color: #fff; border: 0; border-radius: 16px; }
.act--report { background: linear-gradient(135deg, #3e6b4f, #52b788); }
.act--sos { background: linear-gradient(135deg, #c1392b, #e5533c); }
.block h2 { margin: 0 0 12px; font-size: 15px; font-weight: 700; color: #2f3a30; }
.state { display: grid; padding: 30px 0; place-items: center; }
.report { margin-bottom: 12px; padding: 14px; background: #fff; border: 1px solid #e5dfce; border-radius: 14px; }
.report__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 9px; }
.report__type { padding: 3px 9px; color: #ba1a1a; font-size: 12px; font-weight: 700; background: #fbe7e5; border-radius: 6px; }
.report__status { padding: 3px 10px; font-size: 12px; font-weight: 700; border-radius: 999px; }
.report__desc { margin: 0; color: #4e554c; font-size: 13px; line-height: 1.55; }
.report__meta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 9px; color: #a79f8c; font-size: 12px; }
.report__level { color: #9a6a24; }
.sheet { padding: 18px 18px calc(20px + env(safe-area-inset-bottom)); max-height: 80vh; overflow-y: auto; }
.sheet__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.sheet__head h3 { margin: 0; font-size: 16px; font-weight: 700; color: #2f3a30; }
.sheet__head button { padding: 0; color: #a79f8c; background: none; border: 0; }
.sf { margin-bottom: 14px; }
.sf label { display: block; margin-bottom: 8px; color: #4e554c; font-size: 13px; font-weight: 600; }
.sf label i { color: #ba1a1a; font-style: normal; }
.sf input, .sf textarea { width: 100%; padding: 11px 13px; font-size: 14px; color: #2f3a30; background: #f7f8f5; border: 1px solid #e5dfce; border-radius: 10px; box-sizing: border-box; }
.sf textarea { resize: none; }
.sf--row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chips button { padding: 8px 14px; color: #4e554c; font-size: 13px; background: #fff; border: 1px solid #e5dfce; border-radius: 999px; }
.chips button.active { color: #fff; font-weight: 700; background: #386641; border-color: #386641; }
.submit { display: flex; align-items: center; justify-content: center; width: 100%; height: 48px; margin-top: 6px; color: #fff; font-size: 15px; font-weight: 700; background: linear-gradient(135deg, #3e6b4f, #52b788); border: 0; border-radius: 12px; }
.submit--sos { background: linear-gradient(135deg, #c1392b, #e5533c); }
.submit:disabled { opacity: .55; }
</style>
