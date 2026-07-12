// 功能目录：全部服务工具墙与全局搜索共用同一份数据。
// 与 Flutter app/lib/core/feature_catalog.dart 的对外功能保持同口径；
// 每项 [name, icon(Vant), route, section, keywords]。
// 注意：本轮（116-P1）多数业务路由仍是迁移占位，点击落到占位页不报错。

export const SECTIONS = [
  { key: 'all', label: '全部' },
  { key: 'agri', label: '农业生产' },
  { key: 'market', label: '流通销售' },
  { key: 'machinery', label: '农机共享' },
  { key: 'policy', label: '惠农政策' },
  { key: 'life', label: '乡村生活' },
  { key: 'data', label: '数据服务' },
  { key: 'ai', label: 'AI 助手' },
]

const RAW = [
  ['病虫害识别', 'scan', '/agri/diagnose', 'agri', ['识病', '拍照识病', '病害', '虫害']],
  ['作物长势监测', 'flower-o', '/agri', 'agri', ['长势', '监测', '遥感']],
  ['农事日历', 'calendar-o', '/agri', 'agri', ['农事', '日历', '农时']],
  ['地块管理', 'location-o', '/agri', 'agri', ['地块', '田地', '土地']],
  ['乡村集市', 'shop-o', '/market', 'market', ['集市', '买卖', '商品', '农产品']],
  ['实时行情', 'chart-trending-o', '/market', 'market', ['行情', '价格', '报价']],
  ['物流查询', 'logistics', '/market/service', 'market', ['物流', '快递', '运输']],
  ['我的订单', 'orders-o', '/market/orders', 'market', ['订单', '下单', '购物']],
  ['农机租赁', 'logistics', '/machinery', 'machinery', ['农机', '租赁', '设备']],
  ['维保提醒', 'clock-o', '/machinery/service', 'machinery', ['维保', '保养', '维修']],
  ['故障诊断', 'warning-o', '/machinery/service', 'machinery', ['故障', '诊断', '报修']],
  ['作业轨迹', 'guide-o', '/machinery/service', 'machinery', ['轨迹', '作业', '定位']],
  ['政策推送', 'description', '/policy', 'policy', ['政策', '惠农', '推送']],
  ['补贴申请', 'records', '/policy/service', 'policy', ['补贴', '申请', '申领']],
  ['法律咨询', 'shield-o', '/policy/service', 'policy', ['法律', '咨询', '维权']],
  ['职业培训', 'friends-o', '/policy/service', 'policy', ['培训', '课程', '技能']],
  ['村医问诊', 'service-o', '/life', 'life', ['村医', '问诊', '健康', '医疗']],
  ['快递代收', 'gift-o', '/life', 'life', ['快递', '代收', '取件']],
  ['乡村旅游', 'photo-o', '/life', 'life', ['旅游', '民宿', '农家乐']],
  ['邻里互助', 'friends-o', '/life', 'life', ['邻里', '互助', '帮忙']],
  ['农情看板', 'bar-chart-o', '/data', 'data', ['看板', '农情', '数据', '统计']],
  ['年度报告', 'notes-o', '/data/service', 'data', ['报告', '年报', '总结']],
  ['统计上报', 'upgrade', '/data/service', 'data', ['上报', '统计', '汇总']],
  ['智能物联', 'cluster-o', '/iot', 'data', ['物联', 'iot', '传感器', '联动']],
  ['AI 智能问答', 'chat-o', '/ai/chat/new', 'ai', ['ai', '问答', '助手', '对话']],
  ['拍照识病', 'photograph', '/agri/diagnose', 'ai', ['拍照', '识病', 'ai识图']],
  ['对话历史', 'clock-o', '/ai', 'ai', ['历史', '对话', '记录']],
  ['全部搜索', 'search', '/search', 'ai', ['搜索', '查找', '检索']],
]

const COLOR = {
  agri: { color: '#386641', bg: '#e7f1e7' },
  market: { color: '#926500', bg: '#f8eddc' },
  machinery: { color: '#2e6e66', bg: '#e2f0ee' },
  policy: { color: '#3e6b4f', bg: '#e6efe8' },
  life: { color: '#734e00', bg: '#f6ead5' },
  data: { color: '#526258', bg: '#e9ece9' },
  ai: { color: '#2d6a4f', bg: '#e1f2e9' },
}

export const FEATURES = RAW.map(([name, icon, route, section, keywords]) => ({
  name,
  icon,
  route,
  section,
  keywords: keywords || [],
  color: (COLOR[section] || COLOR.agri).color,
  bg: (COLOR[section] || COLOR.agri).bg,
}))

export const SECTION_LABEL = SECTIONS.reduce((map, item) => {
  map[item.key] = item.label
  return map
}, {})

/** 关键词/名称模糊命中，供搜索页取功能入口。 */
export function matchFeatures(query, limit = 8) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return []
  return FEATURES.filter((feature) => {
    if (feature.name.toLowerCase().includes(q)) return true
    return feature.keywords.some((keyword) => {
      const key = keyword.toLowerCase()
      return key.includes(q) || q.includes(key)
    })
  }).slice(0, limit)
}
