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
export default {
  name:'AllFeaturesView', components:{AppShell}, data:()=>({section:'all', sections:[{key:'all',label:'全部'},{key:'agri',label:'农业生产'},{key:'market',label:'流通销售'},{key:'machinery',label:'农机共享'},{key:'policy',label:'惠农政策'},{key:'life',label:'乡村生活'},{key:'data',label:'数据服务'},{key:'ai',label:'AI 助手'}], features:[
    ['病虫害识别','scan','/agri/diagnose','agri'],['作物长势监测','flower-o','/agri','agri'],['农事日历','calendar-o','/agri','agri'],['地块管理','location-o','/agri','agri'],
    ['乡村集市','shop-o','/market','market'],['实时行情','chart-trending-o','/market','market'],['物流查询','logistics','/market/service','market'],['我的订单','orders-o','/market/orders','market'],
    ['农机租赁','logistics','/machinery','machinery'],['维保提醒','clock-o','/machinery/service','machinery'],['故障诊断','warning-o','/machinery/service','machinery'],['作业轨迹','guide-o','/machinery/service','machinery'],
    ['政策推送','description','/policy','policy'],['补贴申请','records','/policy/service','policy'],['法律咨询','shield-o','/policy/service','policy'],['职业培训','friends-o','/policy/service','policy'],
    ['村医问诊','service-o','/life','life'],['快递代收','gift-o','/life','life'],['乡村旅游','photo-o','/life','life'],['邻里互助','friends-o','/life','life'],
    ['农情看板','bar-chart-o','/data','data'],['年度报告','notes-o','/data/service','data'],['统计上报','upgrade','/data/service','data'],['智能物联','cluster-o','/iot','data'],
    ['AI 智能问答','chat-o','/ai/chat/new','ai'],['拍照识病','photograph','/agri/diagnose','ai'],['对话历史','clock-o','/ai','ai'],['全部搜索','search','/search','ai']
  ]}),
  computed:{visible(){return this.features.filter(x=>this.section==='all'||x[3]===this.section).map(x=>({name:x[0],icon:x[1],route:x[2],section:x[3],color:x[3]==='market'?'#926500':x[3]==='policy'?'#3e6b4f':x[3]==='life'?'#734e00':'#386641',bg:x[3]==='market'?'#f8eddc':'#e7f1e7'}))}}
}
</script>

<style scoped>
.features { max-width:600px; margin:auto; padding:12px 14px 28px; }.filter { display:flex; overflow-x:auto; padding:2px 0 11px; gap:8px; scrollbar-width:none; }.filter button { flex:0 0 auto; padding:7px 12px; color:#726a57; background:#fff; border:1px solid #e5dfce; border-radius:999px; font-size:11px; }.filter button.active { color:#fff; background:#386641; border-color:#386641; font-weight:800; }.feature-card { padding:19px 10px; background:#fff; border:1px solid #e5dfce; border-radius:20px; }.feature-grid { display:grid; grid-template-columns:repeat(4,1fr); row-gap:21px; }.feature-grid button { display:flex; min-width:0; padding:0 2px; background:none; border:0; align-items:center; flex-direction:column; gap:7px; }.feature-grid span { display:grid; width:45px; height:45px; border-radius:14px; place-items:center; }.feature-grid em { min-height:28px; color:#4e554c; font-size:10px; font-style:normal; line-height:1.35; text-align:center; }
</style>
