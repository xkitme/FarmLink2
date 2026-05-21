import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FILE = path.join(__dirname, '../../data/api-switches.json')

// 可控功能特性定义
export const FEATURE_DEFINITIONS = [
  { key: 'ai_chat',       name: 'AI 文化向导对话',   category: 'AI功能',   desc: '文化向导 + 历史人物扮演对话' },
  { key: 'ai_translate',  name: 'AI 古文翻译',        category: 'AI功能',   desc: '古文↔现代文双向翻译' },
  { key: 'ai_quiz',       name: 'AI 智能出题',        category: 'AI功能',   desc: '根据内容自动生成测验题' },
  { key: 'ai_calligraphy',name: 'AI 书法点评',        category: 'AI功能',   desc: '上传作品获取AI点评' },
  { key: 'user_register', name: '用户注册',            category: '认证',     desc: '新用户注册功能' },
  { key: 'community',     name: '社区发帖/评论',       category: '社区',     desc: '发布作品和发表评论' },
  { key: 'challenges',    name: '每日挑战',            category: '挑战',     desc: '每日挑战题目与排行榜' },
  { key: 'learning',      name: '学习打卡/测验',       category: '学习',     desc: '每日打卡和测验提交' },
  { key: 'search',        name: '内容搜索',            category: '搜索',     desc: '全文内容搜索功能' },
  { key: 'media_upload',  name: '文件上传',            category: '媒体',     desc: '用户图片/作品上传' },
]

// 特性 → 请求匹配规则
const FEATURE_RULES = {
  ai_chat:       (m, p) => p.startsWith('/api/ai/'),
  ai_translate:  (m, p) => m === 'POST' && p === '/api/ai/translate',
  ai_quiz:       (m, p) => m === 'POST' && p === '/api/ai/quiz/generate',
  ai_calligraphy:(m, p) => m === 'POST' && p === '/api/ai/calligraphy/review',
  user_register: (m, p) => m === 'POST' && p === '/api/auth/register',
  community:     (m, p) => m === 'POST' && (p.startsWith('/api/community/works')),
  challenges:    (m, p) => p.includes('/challenges/'),
  learning:      (m, p) => m === 'POST' && p.startsWith('/api/learning/'),
  search:        (m, p) => p.startsWith('/api/search'),
  media_upload:  (m, p) => m === 'POST' && p.startsWith('/api/media/upload'),
}

let switches = {}

export function loadSwitches() {
  try {
    if (fs.existsSync(FILE)) {
      switches = JSON.parse(fs.readFileSync(FILE, 'utf8'))
    }
  } catch {
    switches = {}
  }
}

function save() {
  fs.writeFileSync(FILE, JSON.stringify(switches, null, 2))
}

export function isFeatureEnabled(key) {
  return switches[key] !== false
}

export function getAll() {
  return FEATURE_DEFINITIONS.map((f) => ({
    ...f,
    enabled: isFeatureEnabled(f.key),
  }))
}

export function toggle(key) {
  switches[key] = !isFeatureEnabled(key)
  save()
  return switches[key]
}

export function checkRequest(method, pathname) {
  for (const [key, rule] of Object.entries(FEATURE_RULES)) {
    if (!isFeatureEnabled(key) && rule(method, pathname)) {
      return { blocked: true, feature: FEATURE_DEFINITIONS.find((f) => f.key === key) }
    }
  }
  return { blocked: false }
}
