<template>
  <SettingsScaffold title="帮助与反馈" fallback="/profile/settings">
    <p class="group-label">常见问题</p>
    <div class="card">
      <div v-for="(item, index) in faqs" :key="index" class="faq">
        <button type="button" class="faq__head" @click="toggle(index)">
          <span>{{ item.q }}</span>
          <van-icon :name="open === index ? 'arrow-up' : 'arrow-down'" size="15" color="#c3bba6" />
        </button>
        <p v-if="open === index" class="faq__body">{{ item.a }}</p>
      </div>
    </div>

    <p class="group-label">联系我们</p>
    <div class="card">
      <div class="contact"><van-icon name="service-o" size="19" color="#386641" /><div><em>在线客服</em><small>工作日 9:00 - 18:00</small></div></div>
      <div class="divider"></div>
      <div class="contact"><van-icon name="envelop-o" size="19" color="#386641" /><div><em>意见邮箱</em><small>support@farmlink.example.com</small></div></div>
      <div class="divider"></div>
      <div class="contact"><van-icon name="phone-o" size="19" color="#386641" /><div><em>服务热线</em><small>400-000-0000</small></div></div>
    </div>

    <p class="note">如遇账号、交易或数据问题，请通过上述渠道联系，我们将在十五个工作日内回复。</p>
  </SettingsScaffold>
</template>

<script>
import SettingsScaffold from '../../components/SettingsScaffold.vue'

export default {
  name: 'HelpView',
  components: { SettingsScaffold },
  data() {
    return {
      open: 0,
      faqs: [
        { q: '忘记密码怎么办？', a: '在登录页点击“忘记密码”，使用账号和绑定手机号完成身份验证后即可重置。为保护安全，重置后旧登录状态会失效，请重新登录。' },
        { q: '拍照识病结果准确吗？', a: 'AI 识别结果仅供参考，受光照、拍摄角度和作物阶段影响。涉及用药和重大处置，请结合农技人员意见综合判断。' },
        { q: '订单和收货地址在哪里管理？', a: '进入“我的—我的订单”查看订单；收货地址在“个人资料”中编辑，下单时会自动带入。' },
        { q: '气象预警提醒收不到？', a: '请在“设置—气象预警提醒”中开启，并确认系统通知权限已授予田园通。' },
        { q: '如何清理占用的存储空间？', a: '在“设置—清除缓存”可一键清理本地缓存；更完整的存储明细可在“存储空间管理”查看。' },
      ],
    }
  },
  methods: {
    toggle(index) { this.open = this.open === index ? -1 : index },
  },
}
</script>

<style scoped>
.group-label { margin: 16px 4px 8px; color: #8d816b; font-size: 12px; font-weight: 700; }
.card { overflow: hidden; background: #fff; border: 1px solid #e5dfce; border-radius: 16px; }
.divider { height: 1px; margin-left: 46px; background: #f0ecde; }
.faq + .faq { border-top: 1px solid #f0ecde; }
.faq__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; padding: 14px; color: #2f3a30; font-size: 14px; font-weight: 600; background: none; border: 0; text-align: left; }
.faq__body { margin: 0; padding: 0 14px 14px; color: #4e554c; font-size: 13px; line-height: 1.72; }
.contact { display: flex; align-items: center; gap: 12px; padding: 14px; }
.contact em { color: #2f3a30; font-size: 14px; font-style: normal; }
.contact small { display: block; margin-top: 2px; color: #a79f8c; font-size: 12px; }
.note { margin: 18px 4px 0; color: #a79f8c; font-size: 12px; line-height: 1.6; }
</style>
