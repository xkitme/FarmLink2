<template>
  <SubPage title="乡村生活" fallback="/home">
    <section class="entries">
      <button v-for="e in entries" :key="e.key" type="button" @click="onEntry(e)">
        <span class="entries__ico" :style="{ color: e.color, backgroundColor: e.bg }"><van-icon :name="e.icon" size="22" /></span>
        <em>{{ e.label }}</em>
      </button>
    </section>

    <div class="tabs">
      <button v-for="t in tabs" :key="t.key" type="button" :class="{ active: tab === t.key }" @click="tab = t.key">{{ t.label }}</button>
    </div>

    <div v-if="loading" class="state"><van-loading size="20" /></div>
    <template v-else>
      <!-- 二手 -->
      <template v-if="tab === 'secondhand'">
        <div v-for="s in secondhand" :key="s.id" class="card">
          <div class="card__row"><em>{{ s.title }}</em><b>￥{{ s.price }}</b></div>
          <span v-if="s.category" class="card__tag">{{ s.category }}</span>
          <p v-if="s.description" class="card__desc">{{ s.description }}</p>
        </div>
        <van-empty v-if="!secondhand.length" description="暂无闲置" />
      </template>

      <!-- 互助 -->
      <template v-else-if="tab === 'help'">
        <div v-for="h in help" :key="h.id" class="card">
          <div class="card__row"><em>{{ h.title }}</em><span class="card__status">{{ h.status === 'OPEN' ? '进行中' : '已完成' }}</span></div>
          <span v-if="h.type" class="card__tag card__tag--teal">{{ h.type }}</span>
          <p v-if="h.content" class="card__desc">{{ h.content }}</p>
        </div>
        <van-empty v-if="!help.length" description="暂无互助信息" />
      </template>

      <!-- 村医 -->
      <template v-else>
        <div v-for="c in clinics" :key="c.id" class="card">
          <div class="card__row"><em>{{ c.name }}</em></div>
          <p class="card__desc"><van-icon name="location-o" size="12" /> {{ c.address }}</p>
          <p class="card__desc">{{ c.doctorName }} · {{ c.phone }}</p>
          <p v-if="c.services" class="card__services">{{ c.services }}</p>
        </div>
        <van-empty v-if="!clinics.length" description="暂无卫生室信息" />
      </template>
    </template>
  </SubPage>
</template>

<script>
import SubPage from '../components/SubPage.vue'

function payload(res) {
  const v = res && res.data !== undefined ? res.data : res
  return v && v.data !== undefined ? v.data : (v || {})
}
function listOf(d) { return Array.isArray(d) ? d : (d.records || d.list || []) }

export default {
  name: 'LifeView',
  components: { SubPage },
  data() {
    return {
      tab: 'secondhand', loading: true,
      secondhand: [], help: [], clinics: [],
      entries: [
        { key: 'secondhand', label: '二手闲置', icon: 'gift-o', color: '#9a6a24', bg: '#f8eddc' },
        { key: 'help', label: '邻里互助', icon: 'friends-o', color: '#2e6e66', bg: '#e2f0ee' },
        { key: 'clinic', label: '村医问诊', icon: 'service-o', color: '#386641', bg: '#e7f1e7' },
        { key: 'publish', label: '我要发布', icon: 'plus', color: '#3e6b4f', bg: '#e7f1e7' },
      ],
      tabs: [
        { key: 'secondhand', label: '二手闲置' },
        { key: 'help', label: '邻里互助' },
        { key: 'clinic', label: '村卫生室' },
      ],
    }
  },
  created() { this.load() },
  methods: {
    onEntry(e) {
      if (e.key === 'publish') { this.$router.push('/publish'); return }
      this.tab = e.key === 'clinic' ? 'clinic' : e.key
    },
    async load() {
      this.loading = true
      const [s, h, c] = await Promise.allSettled([
        this.$api.get('/life/secondhand/list', { page: 1, pageSize: 20 }),
        this.$api.get('/life/help/list', { page: 1, pageSize: 20 }),
        this.$api.get('/life/clinic/list'),
      ])
      if (s.status === 'fulfilled') this.secondhand = listOf(payload(s.value))
      if (h.status === 'fulfilled') this.help = listOf(payload(h.value))
      if (c.status === 'fulfilled') this.clinics = listOf(payload(c.value))
      this.loading = false
    },
  },
}
</script>

<style scoped>
.entries { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
.entries button { display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 4px 0; background: none; border: 0; font-size: 12px; color: #4e554c; }
.entries__ico { display: grid; width: 48px; height: 48px; border-radius: 15px; place-items: center; }
.entries em { font-style: normal; }
.tabs { display: flex; gap: 8px; margin-bottom: 14px; }
.tabs button { flex: 1; padding: 9px 0; color: #726a57; font-size: 13px; background: #fff; border: 1px solid #e5dfce; border-radius: 999px; }
.tabs button.active { color: #fff; font-weight: 700; background: #386641; border-color: #386641; }
.state { display: grid; padding: 40px 0; place-items: center; }
.card { margin-bottom: 12px; padding: 14px; background: #fff; border: 1px solid #e5dfce; border-radius: 14px; }
.card__row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.card__row em { font-style: normal; font-weight: 700; font-size: 15px; color: #2f3a30; }
.card__row b { flex: 0 0 auto; color: #ba1a1a; font-size: 17px; font-weight: 800; }
.card__status { flex: 0 0 auto; padding: 2px 9px; color: #386641; font-size: 11px; background: #e7f1e7; border-radius: 999px; }
.card__tag { display: inline-block; margin-top: 8px; padding: 3px 9px; color: #8a5b17; font-size: 11px; background: #f6ead5; border-radius: 6px; }
.card__tag--teal { color: #2e6e66; background: #e2f0ee; }
.card__desc { display: flex; align-items: center; gap: 4px; margin: 8px 0 0; color: #726a57; font-size: 13px; line-height: 1.55; }
.card__services { margin: 8px 0 0; padding: 8px 10px; color: #4e554c; font-size: 12px; line-height: 1.5; background: #f4f7f2; border-radius: 8px; }
</style>
