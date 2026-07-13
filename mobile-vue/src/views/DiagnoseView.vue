<template>
  <SubPage title="拍照识病" fallback="/agri">
    <div class="diagnose">
      <!-- 上传区 -->
      <label class="picker" :class="{ 'is-busy': analyzing }">
        <template v-if="preview">
          <img :src="preview" alt="" />
          <span v-if="!analyzing" class="picker__change">重新选择</span>
        </template>
        <template v-else>
          <van-icon name="photograph" size="40" />
          <span>点击拍照或从相册选择</span>
          <small>拍摄叶片正反面或病斑特写，识别更准</small>
        </template>
        <input type="file" accept="image/*" :disabled="analyzing" @change="onPick" />
      </label>

      <div v-if="analyzing" class="analyzing"><van-loading size="22">识别中，请稍候…</van-loading></div>

      <!-- 结果 -->
      <section v-if="result" class="result" :class="{ 'result--unknown': isUnknown }">
        <div class="result__head">
          <span class="result__label">{{ result.resultLabel }}</span>
          <span v-if="!isUnknown" class="result__conf">可信度 {{ confidencePct }}%</span>
        </div>
        <div v-if="!isUnknown" class="result__meter"><div class="result__meter-fill" :style="{ width: confidencePct + '%' }"></div></div>
        <div class="result__block">
          <h3>处理建议</h3>
          <p>{{ result.adviceText || '暂无建议' }}</p>
        </div>
        <div v-if="result.detail" class="result__block">
          <h3>判断依据</h3>
          <p>{{ result.detail }}</p>
        </div>

        <!-- 反馈 -->
        <div v-if="result.recordId" class="feedback">
          <span class="feedback__q">识别得准吗？</span>
          <div v-if="!feedbackDone" class="feedback__btns">
            <button type="button" @click="sendFeedback('correct')"><van-icon name="good-job-o" size="16" /> 准确</button>
            <button type="button" @click="sendFeedback('incorrect')"><van-icon name="close" size="16" /> 不准</button>
            <button type="button" @click="sendFeedback('unsure')"><van-icon name="question-o" size="16" /> 不确定</button>
          </div>
          <span v-else class="feedback__thanks"><van-icon name="checked" size="15" /> 感谢反馈</span>
        </div>
      </section>

      <p class="disclaimer">AI 识别结果仅供参考，重大处置请咨询农技人员。</p>
    </div>
  </SubPage>
</template>

<script>
import SubPage from '../components/SubPage.vue'
import { postForm } from '../api/client'

export default {
  name: 'DiagnoseView',
  components: { SubPage },
  data() {
    return { preview: '', analyzing: false, result: null, feedbackDone: false }
  },
  computed: {
    confidencePct() { return Math.round((Number(this.result && this.result.confidence) || 0) * 100) },
    isUnknown() { return !this.result || this.result.resultLabel === '无法识别' || this.confidencePct === 0 },
  },
  methods: {
    async onPick(e) {
      const file = e.target.files && e.target.files[0]
      e.target.value = ''
      if (!file) return
      if (file.size > 8 * 1024 * 1024) { this.$toast('图片不能超过 8MB'); return }
      if (this.preview) URL.revokeObjectURL(this.preview)
      this.preview = URL.createObjectURL(file)
      this.result = null
      this.feedbackDone = false
      this.analyzing = true
      try {
        const form = new FormData()
        form.append('image', file)
        form.append('detectType', 'DISEASE')
        this.result = await postForm('/ai/image/analyze', form, { timeout: 60000 })
      } catch (err) {
        this.$toast((err && err.message) || '识别失败，请重试')
      } finally {
        this.analyzing = false
      }
    },
    async sendFeedback(feedback) {
      try {
        await this.$api.post('/ai/detect-feedback', { recordId: this.result.recordId, feedback })
        this.feedbackDone = true
        this.$toast.success('已记录反馈')
      } catch (err) {
        this.$toast((err && err.message) || '反馈失败')
      }
    },
  },
  beforeDestroy() {
    if (this.preview) URL.revokeObjectURL(this.preview)
  },
}
</script>

<style scoped>
.diagnose { padding-bottom: 20px; }
.picker { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 200px; padding: 24px; color: #9db5a3; text-align: center; background: #fff; border: 1.5px dashed #cfe0d3; border-radius: 18px; overflow: hidden; }
.picker.is-busy { opacity: .7; }
.picker img { width: 100%; border-radius: 12px; }
.picker span { font-size: 14px; color: #4e554c; }
.picker small { font-size: 12px; color: #a79f8c; }
.picker__change { position: absolute; right: 10px; bottom: 10px; padding: 5px 12px; color: #fff; font-size: 12px; background: rgba(0,0,0,.5); border-radius: 999px; }
.picker input { display: none; }
.analyzing { display: grid; padding: 24px 0; place-items: center; }
.result { margin-top: 16px; padding: 18px; background: #fff; border: 1px solid #d6e6d8; border-radius: 18px; }
.result--unknown { border-color: #e5dfce; }
.result__head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.result__label { font-size: 19px; font-weight: 800; color: #2f3a30; }
.result--unknown .result__label { color: #8d816b; }
.result__conf { flex: 0 0 auto; color: #386641; font-size: 13px; font-weight: 700; }
.result__meter { height: 8px; margin: 12px 0 4px; background: #eef0e9; border-radius: 999px; overflow: hidden; }
.result__meter-fill { height: 100%; background: linear-gradient(90deg, #52b788, #386641); border-radius: 999px; }
.result__block { margin-top: 16px; }
.result__block h3 { margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #386641; }
.result__block p { margin: 0; color: #4e554c; font-size: 14px; line-height: 1.7; }
.feedback { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 18px; padding-top: 16px; border-top: 1px solid #f0ecde; }
.feedback__q { color: #726a57; font-size: 13px; }
.feedback__btns { display: flex; gap: 8px; }
.feedback__btns button { display: inline-flex; align-items: center; gap: 3px; padding: 6px 11px; color: #4e554c; font-size: 12px; background: #f4f7f2; border: 1px solid #e5dfce; border-radius: 999px; }
.feedback__thanks { display: inline-flex; align-items: center; gap: 4px; color: #386641; font-size: 13px; font-weight: 600; }
.disclaimer { margin: 18px 4px 0; color: #a79f8c; font-size: 12px; line-height: 1.6; }
</style>
