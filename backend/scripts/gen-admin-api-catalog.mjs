/**
 * 116f-E 管理台 API 目录生成器（静态、可重复执行、输出确定）。
 *
 * 单一事实源：backend/src/contracts/capabilities.js（能力注册表）。
 * 本脚本不新增第二份 API 清单：
 * - API_CATALOG 的全部 v1 条目由注册表生成：key=apiId、method/path/auth/roles
 *   与注册表一致（auth 映射：required→true，optional→false，与调试页“可匿名”语义一致）；
 * - v1 调试预设（DEBUG_PRESETS overlay）只是人工维护的“调试样例装饰”
 *   （name/description/bodyNote/body/示例 path），叠加到对应注册表条目上，
 *   不改 method/path/auth/roles 语义；每个预设的 method+规范化 path 必须
 *   恰好命中 1 条注册表 v1 API，否则生成失败（fail-fast，防预设与注册表漂移）。
 *   /admin/* 端点挂载在 /api/v1 下（platform.routes.js），同样在注册表内。
 *
 * 输出：backend/admin/src/apiCatalog.js（提交进版本库的生成产物）。
 *
 * 用法（cwd = backend/）：
 *   node scripts/gen-admin-api-catalog.mjs --write   重新生成
 *   node scripts/gen-admin-api-catalog.mjs --check   校验生成产物与注册表一致（漂移门禁）
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CAPABILITY_REGISTRY } from '../src/contracts/capabilities.js'

const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_FILE = path.join(BACKEND_ROOT, 'admin', 'src', 'apiCatalog.js')

/** 参数段（:xxx）与纯数字段统一为 :p，query 忽略——用于把调试预设的示例路径
 *  （如 /ai/qa/threads/1）对齐到注册表路径（/ai/qa/threads/:threadId）。 */
function normalizePath(routePath) {
  const bare = routePath.split('?')[0]
  const segments = bare.split('/').filter(Boolean).map((seg) => {
    if (seg.startsWith(':') || /^\d+$/.test(seg)) return ':p'
    return seg
  })
  return `/${segments.join('/')}`
}

function signatureOf(api) {
  return `${api.method} ${normalizePath(api.path)}`
}

// ── v1 调试预设（人工维护的调试样例；key = METHOD + 规范化 path）──────────
// 仅装饰 name/description/bodyNote/body/examplePath，不定义 API 事实。
const DEBUG_PRESETS = Object.freeze({
  'GET /data/dashboard': {
    name: '运营驾驶舱',
    description: '读取首页统计卡片、作物面积分布和服务状态。',
    bodyNote: '无需请求体。',
  },
  'GET /ai/status': {
    name: 'AI 状态',
    description: '检查模型服务、规则引擎和平台知识库状态。',
    bodyNote: '无需请求体。',
  },
  'GET /ai/model/version': {
    name: 'AI 模型配置',
    description: '查看当前问答、视觉和检索模型配置。',
    bodyNote: '无需请求体。',
  },
  'GET /search': {
    name: '全局搜索',
    examplePath: '/search?keyword=玉米',
    description: '跨政策、农技、商品和生活服务做统一检索。',
    bodyNote: '通过 query 参数传 keyword。',
  },
  'GET /notification/list': {
    name: '消息通知列表',
    examplePath: '/notification/list?pageNum=1&pageSize=10&type=ALERT',
    description: '读取用户消息通知，支持按类型与已读状态筛选。',
    bodyNote: '可通过 type=ALERT/POLICY/FARM/SYSTEM 与 isRead=true/false 过滤。',
  },
  'GET /notification/unread': {
    name: '消息未读数',
    description: '读取当前账号的未读消息数量。',
    bodyNote: '无需请求体。',
  },
  'GET /agri/plot/list': {
    name: '地块列表',
    examplePath: '/agri/plot/list?pageNum=1&pageSize=10',
    description: '查询平台地块档案，供农事记录和 GIS 管理使用。',
    bodyNote: '无需请求体。',
  },
  'POST /agri/record': {
    name: '新增农事记录',
    description: '创建播种、施肥、打药、灌溉、收获等农事记录。',
    bodyNote: 'recordType、cropType、content、recordDate 是创建农事记录的关键字段。',
    body: {
      userId: 1,
      plotId: 1,
      recordType: '施肥',
      cropType: '玉米',
      content: '追施复合肥 20 公斤，土壤墒情良好',
      cost: 86,
      recordDate: '2026-05-21',
      localUuid: 'farm-record-001',
    },
  },
  'POST /agri/yield/predict': {
    name: '产量预测',
    description: '使用规则引擎与轻量模型根据地块和作物信息返回产量预测。',
    bodyNote: 'plotId 与 cropType 用于定位地块和作物，areaMu 可辅助估算。',
    body: {
      plotId: 1,
      cropType: '玉米',
      areaMu: 8.5,
    },
  },
  'GET /market/price': {
    name: '行情查询',
    examplePath: '/market/price?productName=玉米&pageNum=1&pageSize=10',
    description: '查询行情缓存与历史价格数据。',
    bodyNote: '通过 query 参数传 productName、category、regionCode。',
  },
  'GET /market/product/list': {
    name: '商品列表',
    examplePath: '/market/product/list?pageNum=1&pageSize=10',
    description: '查询乡村集市商品。',
    bodyNote: '无需请求体。',
  },
  'POST /market/package/generate': {
    name: '包装文案生成',
    description: '调用 AI 服务或规则模板生成农产品包装文案。',
    bodyNote: 'productName、feature、targetMarket 越完整，生成结果越稳定。',
    body: {
      productName: '高山玉米',
      feature: '海拔高、昼夜温差大、口感清甜',
      targetMarket: '社区团购',
    },
  },
  'GET /policy/list': {
    name: '政策列表',
    examplePath: '/policy/list?pageNum=1&pageSize=10',
    description: '读取国家、省、县三级惠农政策。',
    bodyNote: '可通过 category、level、keyword 查询。',
  },
  'POST /policy/ai/ask': {
    name: '政策 AI 问答',
    description: '基于平台知识库回答政策问题。',
    bodyNote: 'question 必填，regionCode 可用于区域政策过滤。',
    body: {
      question: '种植玉米有没有补贴，怎么申请？',
      regionCode: '440100',
    },
  },
  'POST /ai/chat': {
    name: '通用 AI 对话',
    description: '调用平台 AI 服务回答通用问题。',
    bodyNote: 'scene 可传 agri、policy、legal、general。',
    body: {
      scene: 'agri',
      question: '玉米叶片发黄可能是什么原因？',
    },
  },
  'GET /ai/qa/records': {
    name: 'AI 对话列表',
    examplePath: '/ai/qa/records?pageNum=1&pageSize=20',
    description: '按会话分页读取 AI 历史摘要，返回 threadId 与消息数。',
    bodyNote: '可通过 pageNum、pageSize、scene 查询。',
  },
  'GET /ai/qa/threads/:p': {
    name: 'AI 单个会话',
    examplePath: '/ai/qa/threads/1',
    description: '读取某个 AI 会话下的全部问答记录。',
    bodyNote: '路径参数 threadId 为会话 ID。',
  },
  'DELETE /ai/qa/record-items/:p': {
    name: '删除单条 AI 记录',
    examplePath: '/ai/qa/record-items/1',
    description: '仅删除指定 id 的单条问答记录，不影响同一会话其它消息。',
    bodyNote: '无需请求体。',
  },
  'DELETE /ai/qa/threads/:p': {
    name: '删除 AI 会话',
    examplePath: '/ai/qa/threads/1',
    description: '删除指定 threadId 的整段 AI 对话。',
    bodyNote: '旧路径 DELETE /ai/qa/records/:id 仍作为兼容 alias，会输出弃用日志。',
  },
  'GET /disaster/alert/list': {
    name: '天气预警列表',
    examplePath: '/disaster/alert/list?pageNum=1&pageSize=10',
    description: '查询村镇级天气预警和灾害提醒。',
    bodyNote: '无需请求体。',
  },
  'POST /data/sync': {
    name: '数据同步',
    description: '接收客户端待发送队列，把业务操作同步到后端。',
    bodyNote: 'items 为待同步操作数组，localUuid 用于去重。',
    body: {
      deviceId: 'device-admin-001',
      items: [
        {
          tableName: 'farm_record',
          operation: 'INSERT',
          localUuid: 'sync-record-001',
          payload: {
            recordType: '灌溉',
            content: '补录灌溉一次',
          },
        },
      ],
    },
  },
  'GET /data/sync/status': {
    name: '同步状态',
    description: '读取同步队列、冲突与最近同步状态。',
    bodyNote: '无需请求体。',
  },
  'GET /admin/api-switch/list': {
    name: 'API 开关列表',
    examplePath: '/admin/api-switch/list?pageNum=1&pageSize=10',
    description: '查看可动态开启/关闭的后端能力。',
    bodyNote: '通过 keyword、category、enabled query 参数过滤。',
  },
  'GET /admin/operation-log/list': {
    name: '操作日志列表',
    examplePath: '/admin/operation-log/list?pageNum=1&pageSize=10',
    description: '查看非 GET API 的审计日志。',
    bodyNote: '通过 module、userId、keyword query 参数过滤。',
  },
  'GET /admin/rate-limit/status': {
    name: '限流快照',
    description: '查看内存限流策略与当前计数。',
    bodyNote: '无需请求体。',
  },
  'GET /admin/seed/summary': {
    name: '初始化数据概览',
    description: '查看后台资源、初始化脚本和数据覆盖情况。',
    bodyNote: '无需请求体。',
  },
})

function registryV1Apis() {
  return CAPABILITY_REGISTRY.capabilities.flatMap((cap) =>
    cap.apis
      .filter((api) => api.version === 'v1')
      .map((api) => ({ cap, api })),
  )
}

export function buildCatalog() {
  const entries = registryV1Apis()

  // 预设必须恰好命中 1 条注册表 v1 API（防预设与注册表漂移）
  const presetBySig = new Map()
  for (const [sig, preset] of Object.entries(DEBUG_PRESETS)) {
    const matches = entries.filter(({ api }) => signatureOf(api) === sig)
    if (matches.length !== 1) {
      throw new Error(
        `调试预设 ${sig} 在注册表中命中 ${matches.length} 条 v1 API（必须恰好 1 条），请修正 DEBUG_PRESETS`,
      )
    }
    presetBySig.set(sig, preset)
  }

  const groups = []
  for (const [sectionKey, sectionTitle] of Object.entries(CAPABILITY_REGISTRY.sections)) {
    const items = entries
      .filter(({ cap }) => cap.section === sectionKey)
      .sort((a, b) => {
        const pathDiff = a.api.path.localeCompare(b.api.path)
        return pathDiff !== 0 ? pathDiff : a.api.method.localeCompare(b.api.method)
      })
      .map(({ cap, api }) => {
        const preset = presetBySig.get(signatureOf(api))
        const item = {
          key: api.apiId,
          name: preset ? preset.name : cap.name,
          method: api.method,
          path: preset && preset.examplePath ? preset.examplePath : api.path,
          auth: api.auth === 'required',
          roles: api.roles ?? null,
          description: preset ? preset.description : '',
          bodyNote: preset ? preset.bodyNote : '',
        }
        if (preset && preset.body !== undefined) {
          item.body = preset.body
        }
        return item
      })
    if (items.length > 0) {
      groups.push({ group: sectionTitle, items })
    }
  }

  return groups
}

function render(groups) {
  return [
    '// 本文件由 scripts/gen-admin-api-catalog.mjs 自动生成，请勿手工编辑。',
    '// 重新生成：cd backend && node scripts/gen-admin-api-catalog.mjs --write',
    '// 漂移检查：cd backend && node scripts/gen-admin-api-catalog.mjs --check',
    '//',
    '// 116f-E 管理台 API 目录（单一事实源 = backend/src/contracts/capabilities.js）：',
    '// - v1 条目全部由注册表生成：key=apiId，method/path/auth/roles 与注册表一致；',
    '// - v1 调试预设（调试样例装饰：name/description/bodyNote/body/示例 path）叠加到对应条目上。',
    'export const API_CATALOG =',
    `${JSON.stringify(groups, null, 2)}`,
    '',
    'export function flatApiCatalog() {',
    '  return API_CATALOG.flatMap((group) => group.items.map((item) => ({ ...item, group: group.group })))',
    '}',
    '',
  ].join('\n')
}

function countItems(groups) {
  return groups.reduce((sum, group) => sum + group.items.length, 0)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
const mode = process.argv[2]

if (isMain && mode === '--write') {
  const groups = buildCatalog()
  fs.writeFileSync(OUT_FILE, render(groups), 'utf8')
  console.log(`✓ 已生成 ${path.relative(BACKEND_ROOT, OUT_FILE)}：${groups.length} 组 / ${countItems(groups)} 条（v1=${registryV1Apis().length}）`)
} else if (isMain && mode === '--check') {
  const groups = buildCatalog()
  const rendered = render(groups)
  const current = fs.readFileSync(OUT_FILE, 'utf8')
  if (current !== rendered) {
    console.error(`✗ ${path.relative(BACKEND_ROOT, OUT_FILE)} 与注册表漂移。请运行：node scripts/gen-admin-api-catalog.mjs --write`)
    process.exit(1)
  }
  console.log(`✓ ${path.relative(BACKEND_ROOT, OUT_FILE)} 与注册表一致（${groups.length} 组 / ${countItems(groups)} 条）`)
} else if (isMain) {
  console.error('用法：node scripts/gen-admin-api-catalog.mjs --write | --check')
  process.exit(2)
}
