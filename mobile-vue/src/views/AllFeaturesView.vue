<template>
  <AppShell title="全部服务" active="all">
    <div class="features">
      <div class="filter"><button v-for="item in sections" :key="item.key" type="button" :class="{active:section===item.key}" @click="section=item.key">{{ item.label }}</button></div>
      <section class="feature-card"><div class="feature-grid"><button v-for="item in visible" :key="item.name" type="button" @click="$router.push(item.route)"><span :style="{color:item.color,backgroundColor:item.bg}"><van-icon :name="item.icon" size="23" /></span><em>{{ item.name }}</em></button></div></section>
    </div>
  </AppShell>
</template>

<script>
import AppShell from '../components/AppShell.vue'
import { FEATURES, SECTIONS } from '../data/features.js'
export default {
  name:'AllFeaturesView', components:{AppShell}, data:()=>({section:'all', sections: SECTIONS}),
  computed:{visible(){return FEATURES.filter(x=>this.section==='all'||x.section===this.section)}}
}
</script>

<style scoped>
.features { max-width:600px; margin:auto; padding:12px 14px 28px; }.filter { display:flex; overflow-x:auto; padding:2px 0 11px; gap:8px; scrollbar-width:none; }.filter button { flex:0 0 auto; padding:7px 12px; color:#726a57; background:#fff; border:1px solid #e5dfce; border-radius:999px; font-size:11px; }.filter button.active { color:#fff; background:#386641; border-color:#386641; font-weight:800; }.feature-card { padding:19px 10px; background:#fff; border:1px solid #e5dfce; border-radius:20px; }.feature-grid { display:grid; grid-template-columns:repeat(4,1fr); row-gap:21px; }.feature-grid button { display:flex; min-width:0; padding:0 2px; background:none; border:0; align-items:center; flex-direction:column; gap:7px; }.feature-grid span { display:grid; width:45px; height:45px; border-radius:14px; place-items:center; }.feature-grid em { min-height:28px; color:#4e554c; font-size:10px; font-style:normal; line-height:1.35; text-align:center; }
</style>
