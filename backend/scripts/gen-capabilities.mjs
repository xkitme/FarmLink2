/**
 * 116f-B 单一能力注册表生成器（静态、可重复执行、输出确定）。
 *
 * 输入：
 * - 源码静态盘点（src/contracts/route-scanner.js，不执行任何业务代码、不连数据库）
 * - apiControl.js 的 RULES（method+regex 开关清单，直接复用同一份数据，不复制逻辑）
 * - 本文件内的手工 overlay（section 名称、既有弃用 alias、D2 迁移方案、v2 骨架端点、
 *   116f-F 起新增 FEATURE_CATALOG：搜索/助手/功能墙的人工可编辑事实源；
 *   capabilities.js 只是本脚本的生成产物/下游规范注册表快照，改 overlay 后必须 --write 重建）
 *
 * 输出：backend/src/contracts/capabilities.js（提交进版本库的生成产物）。
 *
 * 用法（cwd = backend/）：
 *   node scripts/gen-capabilities.mjs --write   重新生成（结构错误时拒绝生成并失败）
 *   node scripts/gen-capabilities.mjs --check   校验生成产物与源码一致（漂移门禁）
 */

import fs from 'node:fs'
import path from 'node:path'
import { scanRouteFiles, BACKEND_ROOT } from '../src/contracts/route-scanner.js'
import { RULES } from '../src/middleware/apiControl.js'

const OUT_FILE = path.join(BACKEND_ROOT, 'src', 'contracts', 'capabilities.js')

const SECTIONS = Object.freeze({
  system: '系统',
  platform: '平台服务',
  agri: '农业生产',
  market: '流通销售',
  machinery: '农机共享',
  disaster: '气象灾害',
  policy: '惠农政策',
  life: '乡村生活',
  data: '数据管理',
  iot: '智慧物联',
  ai: 'AI 能力',
})

// 既有弃用 alias（116f §5.5：只登记这一条，v1 行为不变）
const DEPRECATED_V1 = Object.freeze({
  'DELETE /ai/qa/records/:id': { deprecatedSince: '2026-08-15', sunset: null },
})

// D2 迁移方案：仅记录设计，不实施（resourceGroups / B20 本轮保持既有 characterization）
const MIGRATION_NOTES = Object.freeze({
  aiDetectRecordResourceGroups: {
    decision: 'D2',
    primaryGroup: 'agri',
    secondaryTags: ['ai'],
    status: 'planned-not-implemented',
    note: 'aiDetectRecord 唯一 primaryGroup=agri，ai 作为 tag/secondaryGroup 表达；既有 resourceGroups 与 B20 characterization 本轮保持不变，去重与契约更新延至实施批次正式开始后。',
  },
})

// v2 骨架端点（D9：ping 公开最小健康信息；capabilities/api-catalog 第一阶段 requireAuth + ADMIN）
const V2_CAPABILITIES = Object.freeze([
  {
    id: 'cap.v2.system.ping',
    section: 'system',
    name: '系统 · GET /ping（v2 健康探针）',
    aliases: [],
    enabled: true,
    regionScoped: false,
    deprecated: false,
    apis: [{
      apiId: 'api.v2.system.ping',
      version: 'v2',
      method: 'GET',
      path: '/ping',
      auth: 'optional',
      roles: null,
      switchKey: null,
      ratePlan: 'global',
      deprecated: false,
      deprecatedSince: null,
      sunset: null,
    }],
  },
  {
    id: 'cap.v2.system.capabilities',
    section: 'system',
    name: '系统 · GET /capabilities（能力注册表目录）',
    aliases: [],
    enabled: true,
    regionScoped: false,
    deprecated: false,
    apis: [{
      apiId: 'api.v2.system.capabilities',
      version: 'v2',
      method: 'GET',
      path: '/capabilities',
      auth: 'required',
      roles: ['ADMIN'],
      switchKey: null,
      ratePlan: 'global',
      deprecated: false,
      deprecatedSince: null,
      sunset: null,
    }],
  },
  {
    id: 'cap.v2.system.api-catalog',
    section: 'system',
    name: '系统 · GET /api-catalog（API 目录）',
    aliases: [],
    enabled: true,
    regionScoped: false,
    deprecated: false,
    apis: [{
      apiId: 'api.v2.system.api-catalog',
      version: 'v2',
      method: 'GET',
      path: '/api-catalog',
      auth: 'required',
      roles: ['ADMIN'],
      switchKey: null,
      ratePlan: 'global',
      deprecated: false,
      deprecatedSince: null,
      sunset: null,
    }],
  },
  // 116f-C：market product 只读样板（薄适配器复用 v1 controller）。
  // ratePlan/switchKey 与对应 v1 能力同语义：GET /market/product/list|/:id 无开关规则、global 桶。
  {
    id: 'cap.v2.market.products',
    section: 'market',
    name: '流通销售 · GET /market/products（v2 商品列表）',
    aliases: [],
    enabled: true,
    regionScoped: false,
    deprecated: false,
    apis: [{
      apiId: 'api.v2.market.products',
      version: 'v2',
      method: 'GET',
      path: '/market/products',
      auth: 'optional',
      roles: null,
      switchKey: null,
      ratePlan: 'global',
      deprecated: false,
      deprecatedSince: null,
      sunset: null,
    }],
  },
  {
    id: 'cap.v2.market.products.detail',
    section: 'market',
    name: '流通销售 · GET /market/products/:id（v2 商品详情）',
    aliases: [],
    enabled: true,
    regionScoped: false,
    deprecated: false,
    apis: [{
      apiId: 'api.v2.market.products.detail',
      version: 'v2',
      method: 'GET',
      path: '/market/products/:id',
      auth: 'optional',
      roles: null,
      switchKey: null,
      ratePlan: 'global',
      deprecated: false,
      deprecatedSince: null,
      sunset: null,
    }],
  },
])

// 116f-F：搜索/助手/功能墙唯一事实源（assistant ROUTE_CATALOG/ROUTE_FEATURES 与
// Flutter feature_catalog.dart 均由本区块生成；capabilities 数组不变，能力数 247 不变）。
// - sections：功能墙 8 个 section 标题（key 与注册表 sections 同 key，标题为 Flutter 侧口径）；
// - routes：页面清单（key 与 App 端 voice_assistant_layer._routePaths 一致，label 为助手页名，
//   path 为对应 Flutter 路由；assistant ROUTE_CATALOG 的来源）；
// - routeFeatures：助手功能点别名（routeKey → 别名数组；assistant ROUTE_FEATURES 的来源）；
// - features：功能墙（Flutter feature_catalog.dart 的来源；routeKey 归属 routes 页面，
//   route 必须与该页面 path 一致，section 必须已登记）。
const FEATURE_CATALOG = Object.freeze({
  sections: Object.freeze({
    agri: 'AI 农业生产',
    market: '流通销售',
    machinery: '农机共享',
    disaster: '气象灾害',
    policy: '惠农政策',
    life: '乡村生活',
    data: '数据管理',
    ai: 'AI 助手',
  }),
  routes: Object.freeze([
    { key: 'home', label: '首页', path: '/home' },
    { key: 'all', label: '全部服务', path: '/all' },
    { key: 'search', label: '全局搜索', path: '/search' },
    { key: 'ai', label: 'AI 农技', path: '/ai' },
    { key: 'ai_chat', label: '新建 AI 对话', path: '/ai/chat/new' },
    { key: 'market', label: '乡村集市', path: '/market' },
    { key: 'orders', label: '我的订单', path: '/market/orders' },
    { key: 'market_service', label: '集市服务工具', path: '/market/service' },
    { key: 'machinery', label: '农机共享', path: '/machinery' },
    { key: 'machinery_service', label: '农机服务工具', path: '/machinery/service' },
    { key: 'policy', label: '惠农政策', path: '/policy' },
    { key: 'policy_service', label: '政策服务工具', path: '/policy/service' },
    { key: 'disaster', label: '气象灾害', path: '/disaster' },
    { key: 'agri', label: '农业生产', path: '/agri' },
    { key: 'agri_diagnose', label: '拍照识病', path: '/agri/diagnose' },
    { key: 'life', label: '乡村生活', path: '/life' },
    { key: 'data', label: '数据看板', path: '/data' },
    { key: 'data_service', label: '数据服务工具', path: '/data/service' },
    { key: 'iot', label: '模拟 IoT 看板', path: '/iot' },
    { key: 'publish', label: '发布', path: '/publish' },
    { key: 'messages', label: '消息', path: '/messages' },
    { key: 'profile', label: '我的', path: '/profile' },
    { key: 'settings', label: '设置中心', path: '/profile/settings' },
    { key: 'account', label: '账号资料', path: '/profile/settings/account' },
    { key: 'account_edit', label: '编辑资料', path: '/profile/settings/account/edit' },
    { key: 'password', label: '修改密码', path: '/profile/settings/password' },
    { key: 'push_settings', label: '消息推送设置', path: '/profile/settings/push' },
    { key: 'weather_alert', label: '天气提醒设置', path: '/profile/settings/weather' },
    { key: 'storage', label: '存储管理', path: '/profile/settings/storage' },
    { key: 'about', label: '关于田园通', path: '/profile/settings/about' },
    { key: 'privacy', label: '隐私设置', path: '/profile/settings/privacy' },
    { key: 'help', label: '帮助与反馈', path: '/profile/settings/help' },
    { key: 'elder_mode', label: '适老模式', path: '/profile/settings/elder' },
    { key: 'screen', label: '村级数字驾驶舱', path: '/screen' },
  ]),
  routeFeatures: Object.freeze({
    agri_diagnose: Object.freeze(['病虫害识别', '拍照识病', '叶片识别', '植保诊断']),
    agri: Object.freeze([
      '作物长势监测', '杂草识别', '种子检测', '智能施肥', '施肥配方', '灌溉计划', '浇水',
      '产量预测', '农事日历', '节气农时', '农药安全查询', '用药间隔', '地块管理', '田块',
      '农事记录', '打药记录', '碳排放核算',
    ]),
    iot: Object.freeze(['智能物联', '物联网', '传感器', '设备监测', '田间监测', '设备联动', '自动灌溉', '联动规则']),
    market: Object.freeze(['乡村集市', '商城', '买卖下单', '实时行情', '农产品价格', '报价']),
    market_service: Object.freeze([
      '价格预测', '期货行情', '出口合规', '收购站地图', '农资团购', 'AI质量分级', '品控',
      '直播话术', '带货', '包装文案', '溯源码', '追溯', '物流查询', '快递运输',
    ]),
    machinery: Object.freeze(['农机租赁', '拖拉机', '收割机', '找农机']),
    machinery_service: Object.freeze([
      '维保提醒', '保养', '故障诊断', '农机维修', '作业轨迹', '成本核算', '土地流转',
      '机手认证', '农机保险',
    ]),
    disaster: Object.freeze([
      '极端天气预警', '天气预报', '气象', '暴雨', '灾情上报', '受灾', '保险理赔', '应急预案',
      '冻害防护', '霜冻', '火险预警', '干旱指数', '旱情', '一键求助', 'SOS', '紧急求助',
    ]),
    policy: Object.freeze(['政策推送', '惠农政策', '三农', '党建学习', '村务公开', '文明乡风榜']),
    policy_service: Object.freeze(['补贴申请', '补助', '政策AI问答', '法律咨询', '普法维权', '职业农民培训', '课程']),
    life: Object.freeze([
      '村医问诊', '看病健康', '快递代收', '取件', '就业平台', '招工找工作', '水电气缴费',
      '水费电费', '乡村旅游', '农家乐', '养老关爱', '农业贷款', '金融借款', '教育辅导',
      '邻里互助', '二手交易', '闲置转让', '民俗记录', '非遗文化', '环境举报', '污染举报',
    ]),
    data: Object.freeze(['农情数据看板', '驾驶舱', '遥感分析', '卫星NDVI']),
    data_service: Object.freeze(['农事年度报告', '统计上报', '数据同步']),
    ai_chat: Object.freeze(['AI智能问答', 'AI助手', '聊天咨询']),
    ai: Object.freeze(['AI对话历史', '历史记录']),
    orders: Object.freeze(['我的订单', '订单查询', '查快递', '订单状态']),
  }),
  features: Object.freeze([
    { name: '病虫害识别', keywords: ['病虫害', '识病', '拍照识别', '叶片', '植保'], routeKey: 'agri_diagnose', route: '/agri/diagnose', icon: 'biotech_outlined', section: 'agri' },
    { name: '作物长势监测', keywords: ['长势', '监测', '作物'], routeKey: 'agri', route: '/agri', icon: 'eco_outlined', section: 'agri' },
    { name: '杂草识别', keywords: ['杂草', '除草'], routeKey: 'agri', route: '/agri', icon: 'grass_outlined', section: 'agri' },
    { name: '种子检测', keywords: ['种子', '发芽率'], routeKey: 'agri', route: '/agri', icon: 'spa_outlined', section: 'agri' },
    { name: '智能施肥', keywords: ['施肥', '肥料', '配方'], routeKey: 'agri', route: '/agri', icon: 'science_outlined', section: 'agri' },
    { name: '灌溉计划', keywords: ['灌溉', '浇水', '排灌'], routeKey: 'agri', route: '/agri', icon: 'water_drop_outlined', section: 'agri' },
    { name: '产量预测', keywords: ['产量', '预测', '收成'], routeKey: 'agri', route: '/agri', icon: 'trending_up', section: 'agri' },
    { name: '农事日历', keywords: ['农事', '日历', '节气', '农时'], routeKey: 'agri', route: '/agri', icon: 'calendar_month_outlined', section: 'agri' },
    { name: '农药安全查询', keywords: ['农药', '安全间隔', '用药'], routeKey: 'agri', route: '/agri', icon: 'medication_outlined', section: 'agri' },
    { name: '地块管理', keywords: ['地块', 'GIS', '田块'], routeKey: 'agri', route: '/agri', icon: 'map_outlined', section: 'agri' },
    { name: '农事记录', keywords: ['农事记录', '打药', '记录'], routeKey: 'agri', route: '/agri', icon: 'note_alt_outlined', section: 'agri' },
    { name: '碳排放核算', keywords: ['碳排放', '碳', '减排'], routeKey: 'agri', route: '/agri', icon: 'co2', section: 'agri' },
    { name: '智能物联', keywords: ['物联', '物联网', 'IoT', '传感器', '设备监测', '智能监测', '田间监测'], routeKey: 'iot', route: '/iot', icon: 'sensors_rounded', section: 'agri' },
    { name: '设备联动', keywords: ['设备联动', '联动', '联动规则', '自动灌溉', '智能联动', '物联联动'], routeKey: 'iot', route: '/iot', icon: 'bolt_rounded', section: 'agri' },
    { name: '实时行情', keywords: ['行情', '价格', '报价'], routeKey: 'market', route: '/market', icon: 'show_chart', section: 'market' },
    { name: '乡村集市', keywords: ['集市', '商城', '买卖', '下单'], routeKey: 'market', route: '/market', icon: 'storefront_outlined', section: 'market' },
    { name: '价格预测', keywords: ['价格预测', '趋势'], routeKey: 'market_service', route: '/market/service', icon: 'query_stats', section: 'market' },
    { name: '期货行情', keywords: ['期货'], routeKey: 'market_service', route: '/market/service', icon: 'candlestick_chart', section: 'market' },
    { name: '出口合规', keywords: ['出口', '合规', '外贸'], routeKey: 'market_service', route: '/market/service', icon: 'public', section: 'market' },
    { name: '收购站地图', keywords: ['收购', '收购站'], routeKey: 'market_service', route: '/market/service', icon: 'store_outlined', section: 'market' },
    { name: '农资团购', keywords: ['团购', '农资'], routeKey: 'market_service', route: '/market/service', icon: 'groups_outlined', section: 'market' },
    { name: 'AI 质量分级', keywords: ['质量分级', '分级', '品控'], routeKey: 'market_service', route: '/market/service', icon: 'grade_outlined', section: 'market' },
    { name: '直播话术', keywords: ['直播', '话术', '带货'], routeKey: 'market_service', route: '/market/service', icon: 'mic_none_outlined', section: 'market' },
    { name: '包装文案', keywords: ['包装', '文案'], routeKey: 'market_service', route: '/market/service', icon: 'inventory_2_outlined', section: 'market' },
    { name: '溯源码', keywords: ['溯源', '追溯'], routeKey: 'market_service', route: '/market/service', icon: 'qr_code_2', section: 'market' },
    { name: '物流查询', keywords: ['物流', '快递', '运输'], routeKey: 'market_service', route: '/market/service', icon: 'local_shipping_outlined', section: 'market' },
    { name: '农机租赁', keywords: ['农机', '租赁', '拖拉机', '收割机'], routeKey: 'machinery', route: '/machinery', icon: 'agriculture_outlined', section: 'machinery' },
    { name: '维保提醒', keywords: ['维保', '保养'], routeKey: 'machinery_service', route: '/machinery/service', icon: 'build_outlined', section: 'machinery' },
    { name: '故障诊断', keywords: ['故障', '诊断', '维修'], routeKey: 'machinery_service', route: '/machinery/service', icon: 'handyman_outlined', section: 'machinery' },
    { name: '作业轨迹', keywords: ['轨迹', '作业'], routeKey: 'machinery_service', route: '/machinery/service', icon: 'route_outlined', section: 'machinery' },
    { name: '成本核算', keywords: ['成本', '核算'], routeKey: 'machinery_service', route: '/machinery/service', icon: 'calculate_outlined', section: 'machinery' },
    { name: '土地流转', keywords: ['土地流转', '流转'], routeKey: 'machinery_service', route: '/machinery/service', icon: 'swap_horiz', section: 'machinery' },
    { name: '机手认证', keywords: ['机手', '认证'], routeKey: 'machinery_service', route: '/machinery/service', icon: 'verified_user_outlined', section: 'machinery' },
    { name: '农机保险', keywords: ['农机保险', '保险'], routeKey: 'machinery_service', route: '/machinery/service', icon: 'shield_outlined', section: 'machinery' },
    { name: '极端天气预警', keywords: ['天气', '预警', '气象', '暴雨'], routeKey: 'disaster', route: '/disaster', icon: 'thunderstorm_outlined', section: 'disaster' },
    { name: '灾情上报', keywords: ['灾情', '上报', '受灾'], routeKey: 'disaster', route: '/disaster', icon: 'report_outlined', section: 'disaster' },
    { name: '保险理赔', keywords: ['理赔', '保险'], routeKey: 'disaster', route: '/disaster', icon: 'assignment_turned_in_outlined', section: 'disaster' },
    { name: '应急预案', keywords: ['应急', '预案'], routeKey: 'disaster', route: '/disaster', icon: 'emergency_outlined', section: 'disaster' },
    { name: '冻害防护', keywords: ['冻害', '霜冻', '防冻'], routeKey: 'disaster', route: '/disaster', icon: 'ac_unit', section: 'disaster' },
    { name: '火险预警', keywords: ['火险', '火灾'], routeKey: 'disaster', route: '/disaster', icon: 'local_fire_department_outlined', section: 'disaster' },
    { name: '干旱指数', keywords: ['干旱', '旱情'], routeKey: 'disaster', route: '/disaster', icon: 'wb_sunny_outlined', section: 'disaster' },
    { name: '一键求助', keywords: ['求助', 'SOS', '紧急'], routeKey: 'disaster', route: '/disaster', icon: 'sos_outlined', section: 'disaster' },
    { name: '政策推送', keywords: ['政策', '惠农', '三农'], routeKey: 'policy', route: '/policy', icon: 'account_balance_outlined', section: 'policy' },
    { name: '补贴申请', keywords: ['补贴', '申请', '补助'], routeKey: 'policy_service', route: '/policy/service', icon: 'fact_check_outlined', section: 'policy' },
    { name: '政策 AI 问答', keywords: ['政策问答', '咨询'], routeKey: 'policy_service', route: '/policy/service', icon: 'question_answer_outlined', section: 'policy' },
    { name: '党建学习', keywords: ['党建', '学习', '打卡'], routeKey: 'policy', route: '/policy', icon: 'flag_outlined', section: 'policy' },
    { name: '村务公开', keywords: ['村务', '公开'], routeKey: 'policy', route: '/policy', icon: 'campaign_outlined', section: 'policy' },
    { name: '文明乡风榜', keywords: ['文明', '乡风', '榜'], routeKey: 'policy', route: '/policy', icon: 'emoji_events_outlined', section: 'policy' },
    { name: '法律咨询', keywords: ['法律', '普法', '维权'], routeKey: 'policy_service', route: '/policy/service', icon: 'gavel_outlined', section: 'policy' },
    { name: '职业农民培训', keywords: ['培训', '职业农民', '课程'], routeKey: 'policy_service', route: '/policy/service', icon: 'school_outlined', section: 'policy' },
    { name: '村医问诊', keywords: ['村医', '问诊', '看病', '健康'], routeKey: 'life', route: '/life', icon: 'medical_services_outlined', section: 'life' },
    { name: '快递代收', keywords: ['快递', '代收', '取件'], routeKey: 'life', route: '/life', icon: 'local_post_office_outlined', section: 'life' },
    { name: '就业平台', keywords: ['就业', '招工', '找工作'], routeKey: 'life', route: '/life', icon: 'work_outline', section: 'life' },
    { name: '水电气缴费', keywords: ['缴费', '水电', '水费', '电费'], routeKey: 'life', route: '/life', icon: 'receipt_long_outlined', section: 'life' },
    { name: '乡村旅游', keywords: ['旅游', '农家乐'], routeKey: 'life', route: '/life', icon: 'landscape_outlined', section: 'life' },
    { name: '养老关爱', keywords: ['养老', '关爱', '老人'], routeKey: 'life', route: '/life', icon: 'elderly', section: 'life' },
    { name: '农业贷款', keywords: ['贷款', '金融', '借款'], routeKey: 'life', route: '/life', icon: 'savings_outlined', section: 'life' },
    { name: '教育辅导', keywords: ['教育', '辅导', '上学'], routeKey: 'life', route: '/life', icon: 'menu_book_outlined', section: 'life' },
    { name: '邻里互助', keywords: ['邻里', '互助', '帮忙'], routeKey: 'life', route: '/life', icon: 'handshake_outlined', section: 'life' },
    { name: '二手交易', keywords: ['二手', '闲置', '转让'], routeKey: 'life', route: '/life', icon: 'sell_outlined', section: 'life' },
    { name: '民俗记录', keywords: ['民俗', '文化', '非遗'], routeKey: 'life', route: '/life', icon: 'festival_outlined', section: 'life' },
    { name: '环境举报', keywords: ['环境', '举报', '污染'], routeKey: 'life', route: '/life', icon: 'eco', section: 'life' },
    { name: '农情数据看板', keywords: ['看板', '数据', '农情', '驾驶舱'], routeKey: 'data', route: '/data', icon: 'insights_outlined', section: 'data' },
    { name: '农事年度报告', keywords: ['年度报告', '报告'], routeKey: 'data_service', route: '/data/service', icon: 'event_note_outlined', section: 'data' },
    { name: '统计上报', keywords: ['统计', '上报'], routeKey: 'data_service', route: '/data/service', icon: 'upload_file_outlined', section: 'data' },
    { name: '数据同步', keywords: ['同步', '队列'], routeKey: 'data_service', route: '/data/service', icon: 'sync_alt', section: 'data' },
    { name: '遥感分析', keywords: ['遥感', '卫星', 'NDVI'], routeKey: 'data', route: '/data', icon: 'satellite_alt_outlined', section: 'data' },
    { name: 'AI 智能问答', keywords: ['AI', '问答', '助手', '聊天'], routeKey: 'ai_chat', route: '/ai/chat/new', icon: 'smart_toy_outlined', section: 'ai' },
    { name: '拍照识病', keywords: ['拍照', '识病', '植保'], routeKey: 'agri_diagnose', route: '/agri/diagnose', icon: 'center_focus_strong_outlined', section: 'ai' },
    { name: 'AI 对话历史', keywords: ['历史', '对话', '记录'], routeKey: 'ai', route: '/ai', icon: 'history', section: 'ai' },
  ]),
})

function slugForPath(routePath) {
  const parts = routePath.split('/').filter(Boolean).map((seg) => seg.replace(/^:/, ''))
  return parts.join('.') || 'root'
}

/** 复用 apiControl.RULES 的同一份数据与同一匹配顺序（v1 开关分类保持不动）。 */
function switchKeyFor(route) {
  for (const rule of RULES) {
    if ((!rule.method || rule.method === route.method) && rule.pattern.test(route.path)) {
      return rule.key
    }
  }
  return null
}

/** featureCatalog 结构校验（fail-fast：任何结构/引用错误都拒绝生成）。 */
function validateFeatureCatalog(fc) {
  const errors = []
  const routeKeys = new Set()
  const routeByKey = new Map()
  for (const r of fc.routes) {
    if (!r || typeof r.key !== 'string' || !r.key) {
      errors.push('featureCatalog.routes 存在缺少合法 key 的条目')
      continue
    }
    if (routeKeys.has(r.key)) errors.push(`featureCatalog.routes key 重复：${r.key}`)
    routeKeys.add(r.key)
    routeByKey.set(r.key, r)
    if (typeof r.label !== 'string' || !r.label) errors.push(`featureCatalog.routes ${r.key} label 非法`)
    if (typeof r.path !== 'string' || !r.path.startsWith('/')) errors.push(`featureCatalog.routes ${r.key} path 非法`)
  }
  const sectionKeys = new Set(Object.keys(fc.sections))
  const featureNames = new Set()
  for (const f of fc.features) {
    if (!f || typeof f.name !== 'string' || !f.name) {
      errors.push('featureCatalog.features 存在缺少合法 name 的条目')
      continue
    }
    if (featureNames.has(f.name)) errors.push(`featureCatalog.features name 重复：${f.name}`)
    featureNames.add(f.name)
    if (!Array.isArray(f.keywords) || f.keywords.length === 0 || f.keywords.some((k) => typeof k !== 'string' || !k)) {
      errors.push(`featureCatalog.features ${f.name} keywords 非法`)
    }
    if (!routeKeys.has(f.routeKey)) errors.push(`featureCatalog.features ${f.name} routeKey 未登记：${f.routeKey}`)
    if (typeof f.route !== 'string' || !f.route.startsWith('/')) errors.push(`featureCatalog.features ${f.name} route 非法`)
    const routePage = routeByKey.get(f.routeKey)
    if (routePage && routePage.path !== f.route) {
      errors.push(`featureCatalog.features ${f.name} route=${f.route} 与页面 ${f.routeKey} path=${routePage.path} 不一致`)
    }
    if (typeof f.icon !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(f.icon)) {
      errors.push(`featureCatalog.features ${f.name} icon 非法（须为 Dart 标识符）：${f.icon}`)
    }
    if (!sectionKeys.has(f.section)) errors.push(`featureCatalog.features ${f.name} section 未登记：${f.section}`)
  }
  for (const [key, aliases] of Object.entries(fc.routeFeatures)) {
    if (!routeKeys.has(key)) {
      errors.push(`featureCatalog.routeFeatures key 未登记：${key}`)
      continue
    }
    if (!Array.isArray(aliases) || aliases.length === 0 || aliases.some((a) => typeof a !== 'string' || !a)) {
      errors.push(`featureCatalog.routeFeatures ${key} 别名非法`)
    } else if (new Set(aliases).size !== aliases.length) {
      errors.push(`featureCatalog.routeFeatures ${key} 别名重复`)
    }
  }
  if (errors.length > 0) {
    throw new Error(`featureCatalog 校验失败：\n- ${errors.join('\n- ')}`)
  }
}

export function buildRegistry() {
  const scan = scanRouteFiles()
  if (scan.duplicates.length > 0) {
    throw new Error(`存在重复 method+path 路由定义，注册表拒绝生成：${JSON.stringify(scan.duplicates, null, 2)}`)
  }
  if (scan.invalid.length > 0) {
    throw new Error(`存在无法解析的路由定义，注册表拒绝生成：${JSON.stringify(scan.invalid, null, 2)}`)
  }
  validateFeatureCatalog(FEATURE_CATALOG)

  const capabilities = []
  const capIds = new Set()
  const apiIds = new Set()

  for (const route of scan.routes) {
    const slug = slugForPath(route.path)
    const methodKey = route.method.toLowerCase()
    const capabilityId = `cap.${route.module}.${slug}.${methodKey}`
    const apiId = `api.${route.module}.${slug}.${methodKey}`
    const dep = DEPRECATED_V1[`${route.method} ${route.path}`] || null

    if (capIds.has(capabilityId)) throw new Error(`capability id 冲突：${capabilityId}`)
    if (apiIds.has(apiId)) throw new Error(`apiId 冲突：${apiId}`)

    capIds.add(capabilityId)
    apiIds.add(apiId)
    capabilities.push({
      id: capabilityId,
      section: route.module,
      name: `${SECTIONS[route.module] || route.module} · ${route.method} ${route.path}`,
      aliases: [],
      enabled: true,
      regionScoped: false,
      deprecated: Boolean(dep),
      apis: [{
        apiId,
        version: 'v1',
        method: route.method,
        path: route.path,
        auth: route.auth,
        roles: route.roles,
        switchKey: switchKeyFor(route),
        // v1 限流沿用 apiControl.ratePlan 现有分类逻辑（116f §5.4：v1 regex 逻辑保持不动，不做大规模迁移）
        ratePlan: null,
        deprecated: Boolean(dep),
        deprecatedSince: dep ? dep.deprecatedSince : null,
        sunset: dep ? dep.sunset : null,
        // 内部对账信息：仅用于盘点/审计，绝不进入外部响应（D9）
        v1: { routesFile: route.file, line: route.line },
      }],
    })
  }

  for (const v2 of V2_CAPABILITIES) {
    if (capIds.has(v2.id)) throw new Error(`capability id 冲突：${v2.id}`)
    capIds.add(v2.id)
    for (const api of v2.apis) {
      if (apiIds.has(api.apiId)) throw new Error(`apiId 冲突：${api.apiId}`)
      apiIds.add(api.apiId)
    }
    capabilities.push(v2)
  }

  capabilities.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

  return {
    schemaVersion: 1,
    apiVersions: ['v1', 'v2'],
    roles: ['FARMER', 'BIGFARMER', 'VILLAGE', 'EXPERT', 'MERCHANT', 'ADMIN'],
    ratePlans: ['global', 'authLogin', 'sms', 'upload', 'adminRead', 'adminWrite', 'ai', 'tts'],
    switchKeys: [...new Set(RULES.map((rule) => rule.key))].sort(),
    sections: SECTIONS,
    migrationNotes: MIGRATION_NOTES,
    capabilities,
    // 116f-F：搜索/助手/功能墙唯一事实源（不影响 capabilities 数组 → 能力数 247 不变）
    featureCatalog: FEATURE_CATALOG,
  }
}

function render(registry) {
  return [
    '// 本文件由 scripts/gen-capabilities.mjs 自动生成，请勿手工编辑。',
    '// 重新生成：cd backend && node scripts/gen-capabilities.mjs --write',
    '// 漂移检查：cd backend && node scripts/gen-capabilities.mjs --check',
    '//',
    '// 116f-B 单一能力注册表初版（schemaVersion=1）：',
    '// - v1：全部现有路由的只读对账登记（盘点脚本生成，不改变 v1 任何行为）；',
    '// - v2：仅 /ping、/capabilities、/api-catalog 三个骨架端点（D9）+ market product 样板；',
    '// - featureCatalog（116f-F）：搜索/助手/功能墙数据源（人工可编辑事实源在本脚本 FEATURE_CATALOG overlay）；',
    '// - 外部响应由 routes/v2 显式投影，v1.routesFile/line、ratePlan/switchKey、featureCatalog 不对外。',
    'export const CAPABILITY_REGISTRY =',
    `${JSON.stringify(registry, null, 2)}\n`,
  ].join('\n')
}

function countApis(registry) {
  return registry.capabilities.reduce((sum, cap) => sum + cap.apis.length, 0)
}

const mode = process.argv[2]

if (mode === '--write') {
  const registry = buildRegistry()
  fs.writeFileSync(OUT_FILE, render(registry), 'utf8')
  console.log(`✓ 已生成 ${path.relative(BACKEND_ROOT, OUT_FILE)}：${registry.capabilities.length} 条能力 / ${countApis(registry)} 条 API（schemaVersion=${registry.schemaVersion}）`)
} else if (mode === '--check') {
  const registry = buildRegistry()
  const rendered = render(registry)
  const current = fs.readFileSync(OUT_FILE, 'utf8')
  if (current !== rendered) {
    console.error(`✗ ${path.relative(BACKEND_ROOT, OUT_FILE)} 与盘点结果漂移。请运行：node scripts/gen-capabilities.mjs --write`)
    process.exit(1)
  }
  console.log(`✓ ${path.relative(BACKEND_ROOT, OUT_FILE)} 与盘点结果一致（${registry.capabilities.length} 条能力 / ${countApis(registry)} 条 API）`)
} else {
  console.error('用法：node scripts/gen-capabilities.mjs --write | --check')
  process.exit(2)
}
