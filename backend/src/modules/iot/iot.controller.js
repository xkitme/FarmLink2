import { ok, errors } from '../../utils/response.js'

const DEVICE_TEMPLATES = [
  {
    id: 'soil-01',
    name: '东区一号土壤墒情仪',
    type: '土壤墒情仪',
    location: '松华村东区 3 号田',
    batteryBase: 86,
    metrics: [
      { key: 'soilMoisture', label: '土壤湿度', base: 61, unit: '%', jitter: 3.2, normal: [45, 72], warning: [35, 82] },
      { key: 'soilTemp', label: '土壤温度', base: 23.6, unit: '℃', jitter: 1.1, normal: [16, 30], warning: [10, 35] },
      { key: 'ec', label: '电导率', base: 1.2, unit: 'mS/cm', jitter: 0.18, normal: [0.5, 2.0], warning: [0.3, 2.6] },
    ],
  },
  {
    id: 'air-01',
    name: '西坡空气温湿度站',
    type: '空气温湿度站',
    location: '长滩村西坡育苗棚',
    batteryBase: 79,
    metrics: [
      { key: 'airTemp', label: '气温', base: 26.4, unit: '℃', jitter: 1.4, normal: [18, 32], warning: [12, 36] },
      { key: 'humidity', label: '空气湿度', base: 68, unit: '%', jitter: 4.5, normal: [45, 82], warning: [32, 90] },
      { key: 'pressure', label: '气压', base: 1007, unit: 'hPa', jitter: 2.6, normal: [995, 1020], warning: [988, 1028] },
    ],
  },
  {
    id: 'pest-01',
    name: '北渠虫情测报灯',
    type: '虫情测报灯',
    location: '松华村北渠玉米带',
    batteryBase: 72,
    metrics: [
      { key: 'catchCount', label: '诱捕量', base: 18, unit: '只', jitter: 6, normal: [0, 25], warning: [0, 42] },
      { key: 'lampTemp', label: '灯箱温度', base: 28.5, unit: '℃', jitter: 1.8, normal: [12, 40], warning: [8, 48] },
      { key: 'voltage', label: '工作电压', base: 12.2, unit: 'V', jitter: 0.35, normal: [11.2, 13.1], warning: [10.6, 13.6] },
    ],
  },
  {
    id: 'water-01',
    name: '南沟水位计',
    type: '水位计',
    location: '长滩村南沟泵站',
    batteryBase: 91,
    metrics: [
      { key: 'waterLevel', label: '水位', base: 1.38, unit: 'm', jitter: 0.12, normal: [0.6, 1.8], warning: [0.4, 2.2] },
      { key: 'flow', label: '流速', base: 0.42, unit: 'm/s', jitter: 0.08, normal: [0.12, 0.8], warning: [0.05, 1.1] },
      { key: 'turbidity', label: '浊度', base: 18, unit: 'NTU', jitter: 4, normal: [0, 35], warning: [0, 55] },
    ],
  },
  {
    id: 'weather-01',
    name: '中心气象观测站',
    type: '光照/气象站',
    location: '松华村服务中心楼顶',
    batteryBase: 88,
    metrics: [
      { key: 'light', label: '光照', base: 42000, unit: 'lx', jitter: 7200, normal: [8000, 70000], warning: [1000, 85000] },
      { key: 'wind', label: '风速', base: 2.4, unit: 'm/s', jitter: 0.9, normal: [0, 7], warning: [0, 11] },
      { key: 'rainfall', label: '雨量', base: 1.6, unit: 'mm', jitter: 1.2, normal: [0, 18], warning: [0, 35] },
    ],
  },
  {
    id: 'greenhouse-01',
    name: '育苗棚环境控制器',
    type: '棚室环境控制器',
    location: '寿安街道育苗示范棚',
    batteryBase: 83,
    metrics: [
      { key: 'co2', label: '二氧化碳', base: 520, unit: 'ppm', jitter: 65, normal: [380, 900], warning: [320, 1200] },
      { key: 'canopyTemp', label: '冠层温度', base: 25.1, unit: '℃', jitter: 1.3, normal: [18, 31], warning: [12, 36] },
      { key: 'leafWetness', label: '叶面湿度', base: 42, unit: '%', jitter: 6, normal: [18, 68], warning: [8, 82] },
    ],
  },
]

function randomBetween(min, max) {
  return min + Math.random() * (max - min)
}

function roundValue(value) {
  if (Math.abs(value) >= 100) return Math.round(value)
  if (Math.abs(value) >= 10) return Number(value.toFixed(1))
  return Number(value.toFixed(2))
}

function metricStatus(value, metric) {
  const [normalMin, normalMax] = metric.normal
  const [warningMin, warningMax] = metric.warning
  if (value >= normalMin && value <= normalMax) return 'normal'
  if (value >= warningMin && value <= warningMax) return 'warning'
  return 'critical'
}

function reading(metric, drift = 0) {
  const value = Math.max(0, metric.base + drift + randomBetween(-metric.jitter, metric.jitter))
  const rounded = roundValue(value)
  return {
    key: metric.key,
    label: metric.label,
    value: rounded,
    unit: metric.unit,
    status: metricStatus(rounded, metric),
  }
}

function buildDevice(template) {
  return {
    id: template.id,
    name: template.name,
    type: template.type,
    location: template.location,
    online: true,
    battery: Math.max(12, Math.min(100, Math.round(template.batteryBase + randomBetween(-4, 3)))),
    updatedAt: new Date().toISOString(),
    metrics: template.metrics.map((metric) => reading(metric)),
  }
}

function buildSeries(template) {
  const now = Date.now()
  return Array.from({ length: 12 }, (_, index) => {
    const age = 11 - index
    const timestamp = new Date(now - age * 5 * 60 * 1000).toISOString()
    const wave = Math.sin(index / 2.2) * 0.45
    return {
      timestamp,
      metrics: template.metrics.map((metric) => reading(metric, wave * metric.jitter)),
    }
  })
}

// ── 设备联动（自动化规则 + 触发记录）────────────────────
// 规则把某设备指标越过阈值与一个执行动作绑定；阈值留足余量，
// 保证 demo 下「虫情」常触发、其余待命、水位停用，呈现稳定。
const LINKAGE_RULES = [
  {
    id: 'lk-soil-irrigation',
    name: '墒情自动滴灌',
    deviceId: 'soil-01',
    metricKey: 'soilMoisture',
    op: '<',
    threshold: 45,
    actionType: 'irrigation',
    action: '联动东区滴灌阀开启 15 分钟',
    desc: '土壤湿度低于 45% 自动补水，避免作物受旱',
    enabledDefault: true,
  },
  {
    id: 'lk-pest-alert',
    name: '虫情活跃 · 植保预警',
    deviceId: 'pest-01',
    metricKey: 'catchCount',
    op: '>',
    threshold: 15,
    actionType: 'alert',
    action: '推送植保预警 · 建议无人机统防统治',
    desc: '诱捕量高于 15 只/夜，联动植保服务提醒',
    enabledDefault: true,
  },
  {
    id: 'lk-greenhouse-vent',
    name: '棚室高温通风',
    deviceId: 'greenhouse-01',
    metricKey: 'canopyTemp',
    op: '>',
    threshold: 31,
    actionType: 'ventilation',
    action: '联动育苗棚顶窗通风降温',
    desc: '冠层温度高于 31℃ 自动开窗散热',
    enabledDefault: true,
  },
  {
    id: 'lk-weather-frost',
    name: '低温霜冻保温',
    deviceId: 'air-01',
    metricKey: 'airTemp',
    op: '<',
    threshold: 12,
    actionType: 'warming',
    action: '联动育苗棚保温帘 · 推送防冻提醒',
    desc: '气温低于 12℃ 放下保温帘并提醒农户',
    enabledDefault: true,
  },
  {
    id: 'lk-water-drain',
    name: '水位过高排涝',
    deviceId: 'water-01',
    metricKey: 'waterLevel',
    op: '>',
    threshold: 1.8,
    actionType: 'drainage',
    action: '联动南沟泵站启动排水',
    desc: '水位高于 1.8m 自动启泵排涝',
    enabledDefault: false,
  },
]

// 启用态运行期覆盖（重启回到默认，demo 足够）
const linkageEnabledOverride = new Map()

function ruleEnabled(rule) {
  return linkageEnabledOverride.has(rule.id)
    ? linkageEnabledOverride.get(rule.id)
    : rule.enabledDefault
}

function conditionMet(op, value, threshold) {
  if (op === '<') return value < threshold
  if (op === '<=') return value <= threshold
  if (op === '>') return value > threshold
  if (op === '>=') return value >= threshold
  return false
}

function buildRule(rule) {
  const template = DEVICE_TEMPLATES.find((item) => item.id === rule.deviceId)
  const metric = template?.metrics.find((item) => item.key === rule.metricKey)
  const current = metric ? reading(metric) : null
  const enabled = ruleEnabled(rule)
  const triggered = !!current && conditionMet(rule.op, current.value, rule.threshold)
  return {
    id: rule.id,
    name: rule.name,
    desc: rule.desc,
    deviceId: rule.deviceId,
    deviceName: template?.name || '未知设备',
    deviceType: template?.type || '',
    metricKey: rule.metricKey,
    metricLabel: metric?.label || '',
    op: rule.op,
    threshold: rule.threshold,
    unit: metric?.unit || '',
    action: rule.action,
    actionType: rule.actionType,
    currentValue: current ? current.value : null,
    enabled,
    status: !enabled ? 'disabled' : triggered ? 'triggered' : 'idle',
  }
}

export async function listLinkageRules(req, res) {
  ok(res, LINKAGE_RULES.map(buildRule))
}

export async function toggleLinkageRule(req, res) {
  const id = `${req.params.id || ''}`.trim()
  const rule = LINKAGE_RULES.find((item) => item.id === id)
  if (!rule) throw errors.notFound('联动规则不存在')
  const enabled = !!(req.body && req.body.enabled)
  linkageEnabledOverride.set(id, enabled)
  ok(res, buildRule(rule))
}

export async function linkageLogs(req, res) {
  // 合成最近触发记录：仅启用规则，按时间倒序，覆盖最近 ~10 小时
  const now = Date.now()
  const samples = [
    { ruleId: 'lk-pest-alert', minutesAgo: 42, value: 23, result: '已推送植保预警' },
    { ruleId: 'lk-soil-irrigation', minutesAgo: 156, value: 41, result: '已开启滴灌 15 分钟' },
    { ruleId: 'lk-greenhouse-vent', minutesAgo: 268, value: 32.4, result: '已开顶窗通风' },
    { ruleId: 'lk-pest-alert', minutesAgo: 393, value: 21, result: '已推送植保预警' },
    { ruleId: 'lk-weather-frost', minutesAgo: 605, value: 10.6, result: '已放保温帘并提醒' },
  ]
  const logs = samples
    .map((sample, index) => {
      const rule = LINKAGE_RULES.find((item) => item.id === sample.ruleId)
      if (!rule || !ruleEnabled(rule)) return null
      const template = DEVICE_TEMPLATES.find((item) => item.id === rule.deviceId)
      const metric = template?.metrics.find((item) => item.key === rule.metricKey)
      return {
        id: `log-${index}`,
        ruleId: rule.id,
        ruleName: rule.name,
        deviceName: template?.name || '',
        message: rule.action,
        value: sample.value,
        unit: metric?.unit || '',
        metricLabel: metric?.label || '',
        result: sample.result,
        createdAt: new Date(now - sample.minutesAgo * 60 * 1000).toISOString(),
      }
    })
    .filter(Boolean)
  ok(res, logs)
}

export async function listDevices(req, res) {
  ok(res, DEVICE_TEMPLATES.map(buildDevice))
}

export async function deviceDetail(req, res) {
  const id = `${req.params.id || ''}`.trim()
  const template = DEVICE_TEMPLATES.find((item) => item.id === id)
  if (!template) throw errors.notFound('设备不存在')

  ok(res, {
    ...buildDevice(template),
    series: buildSeries(template),
  })
}
