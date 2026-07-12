<template>
  <AppShell title="发布" subtitle="把身边事分享给全村" active="publish">
    <div class="publish">
      <p class="publish__label">记录与上报</p>
      <div class="grid">
        <button type="button" class="entry" @click="$router.push('/agri/record/new')"><span class="entry__ico entry__ico--green"><van-icon name="records" size="24" /></span><em>记一笔农事</em><small>建档农事活动</small></button>
        <button type="button" class="entry" @click="$router.push('/disaster')"><span class="entry__ico entry__ico--red"><van-icon name="warning-o" size="24" /></span><em>灾情上报</em><small>受灾情况上报</small></button>
      </div>

      <p class="publish__label">发布信息</p>
      <div class="grid">
        <button type="button" class="entry" @click="open('secondhand')"><span class="entry__ico entry__ico--gold"><van-icon name="gift-o" size="24" /></span><em>卖闲置</em><small>二手物品转让</small></button>
        <button type="button" class="entry" @click="open('help')"><span class="entry__ico entry__ico--teal"><van-icon name="friends-o" size="24" /></span><em>邻里互助</em><small>发起互助请求</small></button>
        <button type="button" class="entry" @click="open('job')"><span class="entry__ico entry__ico--green"><van-icon name="manager-o" size="24" /></span><em>招零工</em><small>发布用工需求</small></button>
        <button type="button" class="entry" @click="$router.push('/market')"><span class="entry__ico entry__ico--gold"><van-icon name="shop-o" size="24" /></span><em>逛集市</em><small>查看在售农产品</small></button>
      </div>
    </div>

    <!-- 卖闲置 -->
    <van-popup v-model="show.secondhand" round position="bottom">
      <div class="sheet">
        <div class="sheet__head"><h3>发布闲置</h3><button type="button" @click="show.secondhand = false"><van-icon name="cross" size="18" /></button></div>
        <div class="sf"><label>标题 <i>*</i></label><input v-model="sh.title" type="text" placeholder="如 九成新电动喷雾器" /></div>
        <div class="sf sf--row">
          <div><label>价格（元）<i>*</i></label><input v-model="sh.price" type="number" inputmode="decimal" placeholder="0" /></div>
          <div><label>分类</label>
            <div class="chips chips--sm"><button v-for="c in shCats" :key="c" type="button" :class="{ active: sh.category === c }" @click="sh.category = c">{{ c }}</button></div>
          </div>
        </div>
        <div class="sf"><label>描述</label><textarea v-model="sh.description" rows="2" placeholder="成色、使用情况…"></textarea></div>
        <div class="sf"><label>联系电话</label><input v-model="sh.contactPhone" type="tel" inputmode="tel" placeholder="便于买家联系" /></div>
        <div class="sf"><label>图片</label><ImageUploader v-model="sh.images" :max="6" /></div>
        <button type="button" class="submit" :disabled="busy || !sh.title || sh.price === ''" @click="submitSecondhand"><van-loading v-if="busy" size="18" color="#fff" /><span v-else>发布闲置</span></button>
      </div>
    </van-popup>

    <!-- 邻里互助 -->
    <van-popup v-model="show.help" round position="bottom">
      <div class="sheet">
        <div class="sheet__head"><h3>邻里互助</h3><button type="button" @click="show.help = false"><van-icon name="cross" size="18" /></button></div>
        <div class="sf"><label>类型</label>
          <div class="chips"><button v-for="t in helpTypes" :key="t" type="button" :class="{ active: hp.type === t }" @click="hp.type = t">{{ t }}</button></div>
        </div>
        <div class="sf"><label>标题 <i>*</i></label><input v-model="hp.title" type="text" placeholder="如 周末帮忙抢收水稻" /></div>
        <div class="sf"><label>详细说明</label><textarea v-model="hp.content" rows="3" placeholder="时间、地点与需要的帮助…"></textarea></div>
        <div class="sf"><label>联系电话</label><input v-model="hp.contactPhone" type="tel" inputmode="tel" placeholder="便于邻里联系" /></div>
        <button type="button" class="submit" :disabled="busy || !hp.title" @click="submitHelp"><van-loading v-if="busy" size="18" color="#fff" /><span v-else>发布互助</span></button>
      </div>
    </van-popup>

    <!-- 招零工 -->
    <van-popup v-model="show.job" round position="bottom">
      <div class="sheet">
        <div class="sheet__head"><h3>发布用工</h3><button type="button" @click="show.job = false"><van-icon name="cross" size="18" /></button></div>
        <div class="sf"><label>岗位标题 <i>*</i></label><input v-model="jb.title" type="text" placeholder="如 柑橘采摘临时工" /></div>
        <div class="sf sf--row">
          <div><label>类型</label>
            <div class="chips chips--sm"><button v-for="t in jobTypes" :key="t" type="button" :class="{ active: jb.jobType === t }" @click="jb.jobType = t">{{ t }}</button></div>
          </div>
          <div><label>需要人数</label><input v-model="jb.headcount" type="number" inputmode="numeric" placeholder="1" /></div>
        </div>
        <div class="sf sf--row">
          <div><label>薪资</label><input v-model="jb.salary" type="text" placeholder="如 150元/天" /></div>
          <div><label>工作地点</label><input v-model="jb.location" type="text" placeholder="村组/地块" /></div>
        </div>
        <div class="sf"><label>要求说明</label><textarea v-model="jb.requirement" rows="2" placeholder="工作内容与要求…"></textarea></div>
        <div class="sf"><label>联系电话</label><input v-model="jb.contactPhone" type="tel" inputmode="tel" placeholder="便于应聘联系" /></div>
        <button type="button" class="submit" :disabled="busy || !jb.title" @click="submitJob"><van-loading v-if="busy" size="18" color="#fff" /><span v-else>发布用工</span></button>
      </div>
    </van-popup>
  </AppShell>
</template>

<script>
import AppShell from '../components/AppShell.vue'
import ImageUploader from '../components/ImageUploader.vue'

export default {
  name: 'PublishView',
  components: { AppShell, ImageUploader },
  data() {
    return {
      busy: false,
      show: { secondhand: false, help: false, job: false },
      shCats: ['农具', '家电', '日用', '其他'],
      helpTypes: ['借用', '帮工', '拼车', '其他'],
      jobTypes: ['日结', '长期', '季节工'],
      sh: { title: '', price: '', category: '农具', description: '', contactPhone: '', images: [] },
      hp: { type: '借用', title: '', content: '', contactPhone: '' },
      jb: { title: '', jobType: '日结', headcount: '', salary: '', location: '', requirement: '', contactPhone: '' },
    }
  },
  methods: {
    open(key) { this.show[key] = true },
    async submitSecondhand() {
      if (!this.sh.title || this.sh.price === '') { this.$toast('标题和价格必填'); return }
      this.busy = true
      try {
        await this.$api.post('/life/secondhand', {
          title: this.sh.title, price: Number(this.sh.price), category: this.sh.category || undefined,
          description: this.sh.description || undefined, contactPhone: this.sh.contactPhone || undefined, images: this.sh.images,
        })
        this.show.secondhand = false
        this.$toast.success('已发布到二手市场')
        this.sh = { title: '', price: '', category: '农具', description: '', contactPhone: '', images: [] }
      } catch (err) { this.$toast((err && err.message) || '发布失败') } finally { this.busy = false }
    },
    async submitHelp() {
      if (!this.hp.title) { this.$toast('标题必填'); return }
      this.busy = true
      try {
        await this.$api.post('/life/help', { type: this.hp.type || undefined, title: this.hp.title, content: this.hp.content || undefined, contactPhone: this.hp.contactPhone || undefined })
        this.show.help = false
        this.$toast.success('互助请求已发布')
        this.hp = { type: '借用', title: '', content: '', contactPhone: '' }
      } catch (err) { this.$toast((err && err.message) || '发布失败') } finally { this.busy = false }
    },
    async submitJob() {
      if (!this.jb.title) { this.$toast('岗位标题必填'); return }
      this.busy = true
      try {
        await this.$api.post('/life/job', {
          title: this.jb.title, jobType: this.jb.jobType || undefined, salary: this.jb.salary || undefined,
          location: this.jb.location || undefined, headcount: this.jb.headcount ? Number(this.jb.headcount) : undefined,
          requirement: this.jb.requirement || undefined, contactPhone: this.jb.contactPhone || undefined,
        })
        this.show.job = false
        this.$toast.success('用工信息已发布')
        this.jb = { title: '', jobType: '日结', headcount: '', salary: '', location: '', requirement: '', contactPhone: '' }
      } catch (err) { this.$toast((err && err.message) || '发布失败') } finally { this.busy = false }
    },
  },
}
</script>

<style scoped>
.publish { max-width: 600px; margin: auto; padding: 14px 16px 24px; }
.publish__label { margin: 6px 4px 12px; color: #8d816b; font-size: 12px; font-weight: 700; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 8px; }
.entry { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 16px; text-align: left; background: #fff; border: 1px solid #e5dfce; border-radius: 16px; }
.entry__ico { display: grid; width: 46px; height: 46px; margin-bottom: 6px; border-radius: 14px; place-items: center; }
.entry__ico--green { color: #386641; background: #e7f1e7; }
.entry__ico--red { color: #ba1a1a; background: #fbe7e5; }
.entry__ico--gold { color: #9a6a24; background: #f8eddc; }
.entry__ico--teal { color: #2e6e66; background: #e2f0ee; }
.entry em { font-style: normal; font-weight: 700; font-size: 15px; color: #2f3a30; }
.entry small { color: #a79f8c; font-size: 12px; }
.sheet { padding: 18px 18px calc(20px + env(safe-area-inset-bottom)); max-height: 82vh; overflow-y: auto; }
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
.chips--sm button { padding: 7px 11px; font-size: 12px; }
.chips button { padding: 8px 14px; color: #4e554c; font-size: 13px; background: #fff; border: 1px solid #e5dfce; border-radius: 999px; }
.chips button.active { color: #fff; font-weight: 700; background: #386641; border-color: #386641; }
.submit { display: flex; align-items: center; justify-content: center; width: 100%; height: 48px; margin-top: 6px; color: #fff; font-size: 15px; font-weight: 700; background: linear-gradient(135deg, #3e6b4f, #52b788); border: 0; border-radius: 12px; }
.submit:disabled { opacity: .55; }
</style>
