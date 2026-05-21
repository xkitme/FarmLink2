// 全量 API 定义，用于在线调试面板
export const API_DEFINITIONS = [
  // ── 认证 ─────────────────────────────────────────────
  {
    id: 'auth-register', category: '认证模块', name: '用户注册',
    method: 'POST', path: '/api/auth/register', requiresAuth: false,
    desc: '创建新用户账号（手机号+密码）',
    body: [
      { name: 'phone',    type: 'string',  required: true,  example: '13800138000', desc: '手机号' },
      { name: 'nickname', type: 'string',  required: true,  example: '墨脉用户',   desc: '昵称' },
      { name: 'password', type: 'string',  required: true,  example: 'Pass1234',   desc: '密码' },
    ],
  },
  {
    id: 'auth-login', category: '认证模块', name: '用户登录',
    method: 'POST', path: '/api/auth/login', requiresAuth: false,
    desc: '手机号+密码登录，返回 JWT Token',
    body: [
      { name: 'phone',    type: 'string', required: true, example: '13800138000', desc: '手机号' },
      { name: 'password', type: 'string', required: true, example: 'Pass1234',    desc: '密码' },
    ],
  },
  {
    id: 'auth-refresh', category: '认证模块', name: '刷新 Token',
    method: 'POST', path: '/api/auth/refresh', requiresAuth: false,
    desc: '用 refreshToken 换取新 accessToken',
    body: [{ name: 'refreshToken', type: 'string', required: true, example: 'eyJ...', desc: 'Refresh Token' }],
  },
  {
    id: 'auth-me', category: '认证模块', name: '获取当前用户信息',
    method: 'GET', path: '/api/auth/me', requiresAuth: true, desc: '返回当前登录用户的详情',
  },
  // ── 内容 ─────────────────────────────────────────────
  {
    id: 'content-list', category: '内容模块', name: '内容列表',
    method: 'GET', path: '/api/contents', requiresAuth: false,
    desc: '分页获取文化内容列表，支持多维过滤',
    query: [
      { name: 'category',   type: 'string',  required: false, example: 'poetry', desc: '分类：poetry|calligraphy|history|classics|season' },
      { name: 'dynasty',    type: 'string',  required: false, example: '唐',     desc: '朝代' },
      { name: 'difficulty', type: 'number',  required: false, example: '2',      desc: '难度 1-5' },
      { name: 'page',       type: 'number',  required: false, example: '1',      desc: '页码' },
      { name: 'limit',      type: 'number',  required: false, example: '20',     desc: '每页数量' },
    ],
  },
  {
    id: 'content-detail', category: '内容模块', name: '内容详情',
    method: 'GET', path: '/api/contents/:id', requiresAuth: false,
    desc: '获取单条内容完整信息（含注释、译文、背景）',
    pathParams: [{ name: 'id', type: 'string', required: true, example: 'uuid', desc: '内容 ID' }],
  },
  {
    id: 'content-daily', category: '内容模块', name: '每日推荐',
    method: 'GET', path: '/api/contents/daily/recommend', requiresAuth: false,
    desc: '返回今日推荐内容列表（缓存至次日0点）',
  },
  {
    id: 'content-season', category: '内容模块', name: '当前节气内容',
    method: 'GET', path: '/api/contents/season/current', requiresAuth: false,
    desc: '根据当前月份返回对应节气的文化内容',
  },
  {
    id: 'content-favorite', category: '内容模块', name: '收藏/取消收藏',
    method: 'POST', path: '/api/contents/:id/favorite', requiresAuth: true,
    desc: '切换收藏状态，返回 {favorited: boolean}',
    pathParams: [{ name: 'id', type: 'string', required: true, example: 'uuid', desc: '内容 ID' }],
  },
  // ── AI ───────────────────────────────────────────────
  {
    id: 'ai-chat', category: 'AI 功能', name: 'AI 文化向导对话（流式）',
    method: 'POST', path: '/api/ai/chat', requiresAuth: true,
    desc: '流式 SSE 输出，返回 text/event-stream',
    body: [
      { name: 'mode',     type: 'string', required: false, example: 'guide',   desc: 'guide|poetry_helper|translation' },
      { name: 'messages', type: 'array',  required: true,
        example: '[{"role":"user","content":"介绍一下李白"}]', desc: '对话历史数组' },
    ],
  },
  {
    id: 'ai-character', category: 'AI 功能', name: '历史人物对话（流式）',
    method: 'POST', path: '/api/ai/character/chat', requiresAuth: true,
    desc: '扮演历史人物进行沉浸式对话，流式输出',
    body: [
      { name: 'character', type: 'string', required: true,  example: 'libai',  desc: 'confucius|libai|sushi' },
      { name: 'messages',  type: 'array',  required: true,
        example: '[{"role":"user","content":"你好，请问饮酒之道？"}]', desc: '对话历史' },
    ],
  },
  {
    id: 'ai-translate', category: 'AI 功能', name: '古文翻译',
    method: 'POST', path: '/api/ai/translate', requiresAuth: true,
    desc: '古文↔现代文翻译，含逐句解析和创作背景',
    body: [{ name: 'text', type: 'string', required: true, example: '学而时习之，不亦说乎？', desc: '待翻译文本' }],
  },
  {
    id: 'ai-quiz', category: 'AI 功能', name: 'AI 生成测验题',
    method: 'POST', path: '/api/ai/quiz/generate', requiresAuth: true,
    desc: '根据内容文本自动生成选择题',
    body: [
      { name: 'contentBody', type: 'string', required: true,  example: '床前明月光...', desc: '内容原文' },
      { name: 'count',       type: 'number', required: false, example: '3',            desc: '生成题目数量' },
    ],
  },
  {
    id: 'ai-calligraphy', category: 'AI 功能', name: '书法 AI 点评',
    method: 'POST', path: '/api/ai/calligraphy/review', requiresAuth: true,
    desc: '上传书法图片（multipart），AI 返回结构化点评',
    body: [{ name: 'image', type: 'file', required: true, example: '', desc: '书法图片（jpg/png）' }],
  },
  {
    id: 'ai-health', category: 'AI 功能', name: 'AI 服务健康检查',
    method: 'GET', path: '/api/ai/health', requiresAuth: true,
    desc: '检查 Ollama 是否在线，返回当前模型名',
  },
  // ── 学习 ─────────────────────────────────────────────
  {
    id: 'learning-today', category: '学习模块', name: '今日学习任务',
    method: 'GET', path: '/api/learning/today', requiresAuth: true,
    desc: '返回今日待完成任务列表（优先待复习内容）',
  },
  {
    id: 'learning-review', category: '学习模块', name: '待复习列表',
    method: 'GET', path: '/api/learning/review/due', requiresAuth: true,
    desc: '根据艾宾浩斯算法返回当前到期待复习内容',
  },
  {
    id: 'learning-progress', category: '学习模块', name: '更新学习进度',
    method: 'POST', path: '/api/learning/progress', requiresAuth: true,
    desc: '记录用户对某内容的学习状态',
    body: [
      { name: 'contentId', type: 'string', required: true,  example: 'uuid', desc: '内容 ID' },
      { name: 'status',    type: 'number', required: false, example: '1',    desc: '0未开始 1进行中 2完成' },
    ],
  },
  {
    id: 'learning-quiz-submit', category: '学习模块', name: '提交测验结果',
    method: 'POST', path: '/api/learning/quiz/submit', requiresAuth: true,
    desc: '提交测验得分，更新掌握程度，触发成就检查',
    body: [
      { name: 'contentId', type: 'string', required: true, example: 'uuid', desc: '内容 ID' },
      { name: 'score',     type: 'number', required: true, example: '85',   desc: '得分 0-100' },
    ],
  },
  {
    id: 'learning-checkin', category: '学习模块', name: '每日打卡',
    method: 'POST', path: '/api/learning/checkin', requiresAuth: true,
    desc: '每日打卡，加10经验，返回连续打卡天数和成就解锁',
  },
  {
    id: 'learning-stats', category: '学习模块', name: '学习统计',
    method: 'GET', path: '/api/learning/stats', requiresAuth: true,
    desc: '返回：总学习数、完成数、平均得分、连续打卡天数',
  },
  // ── 社区 ─────────────────────────────────────────────
  {
    id: 'community-works', category: '社区模块', name: '作品广场',
    method: 'GET', path: '/api/community/works', requiresAuth: false,
    desc: '分页获取用户公开作品列表',
    query: [
      { name: 'type',  type: 'string', required: false, example: 'calligraphy', desc: 'calligraphy|poetry|painting' },
      { name: 'page',  type: 'number', required: false, example: '1',           desc: '页码' },
      { name: 'limit', type: 'number', required: false, example: '20',          desc: '每页数量' },
    ],
  },
  {
    id: 'community-create-work', category: '社区模块', name: '发布作品',
    method: 'POST', path: '/api/community/works', requiresAuth: true,
    desc: '发布书法/诗词/国画作品',
    body: [
      { name: 'workType', type: 'string', required: true,  example: 'poetry',    desc: 'calligraphy|poetry|painting' },
      { name: 'title',    type: 'string', required: false, example: '春日即兴',  desc: '作品标题' },
      { name: 'content',  type: 'string', required: false, example: '春风...',   desc: '作品内容（诗词文本）' },
    ],
  },
  {
    id: 'community-like', category: '社区模块', name: '点赞/取消点赞',
    method: 'POST', path: '/api/community/works/:id/like', requiresAuth: true,
    desc: '切换点赞状态，返回 {liked: boolean}',
    pathParams: [{ name: 'id', type: 'string', required: true, example: 'uuid', desc: '作品 ID' }],
  },
  {
    id: 'community-comment', category: '社区模块', name: '发表评论',
    method: 'POST', path: '/api/community/works/:id/comments', requiresAuth: true,
    desc: '对作品发表评论',
    pathParams: [{ name: 'id', type: 'string', required: true, example: 'uuid', desc: '作品 ID' }],
    body: [{ name: 'content', type: 'string', required: true, example: '写得真好！', desc: '评论内容' }],
  },
  {
    id: 'community-challenge', category: '社区模块', name: '获取今日挑战',
    method: 'GET', path: '/api/community/challenges/daily', requiresAuth: false,
    desc: '返回今日挑战题目（隐藏正确答案）',
  },
  {
    id: 'community-challenge-submit', category: '社区模块', name: '提交挑战答案',
    method: 'POST', path: '/api/community/challenges/daily/submit', requiresAuth: true,
    desc: '提交今日挑战答案，返回是否正确和解析',
    body: [{ name: 'answer', type: 'string', required: true, example: 'B', desc: '选项 A/B/C/D' }],
  },
  // ── 成就 ─────────────────────────────────────────────
  {
    id: 'achievements-list', category: '成就模块', name: '全部成就列表',
    method: 'GET', path: '/api/achievements', requiresAuth: false,
    desc: '返回所有成就定义及解锁条件',
  },
  {
    id: 'achievements-mine', category: '成就模块', name: '我的成就',
    method: 'GET', path: '/api/achievements/me', requiresAuth: true,
    desc: '返回当前用户已解锁的成就列表',
  },
  {
    id: 'achievements-leaderboard', category: '成就模块', name: '排行榜',
    method: 'GET', path: '/api/achievements/leaderboard', requiresAuth: false,
    desc: '返回经验值 Top50 排行榜',
    query: [{ name: 'type', type: 'string', required: false, example: 'all', desc: 'all|weekly' }],
  },
  // ── 搜索 ─────────────────────────────────────────────
  {
    id: 'search', category: '搜索模块', name: '内容搜索',
    method: 'GET', path: '/api/search', requiresAuth: false,
    desc: '全文搜索文化内容（标题、正文、作者）',
    query: [
      { name: 'q',        type: 'string', required: true,  example: '静夜思', desc: '搜索关键词' },
      { name: 'category', type: 'string', required: false, example: 'poetry', desc: '分类过滤' },
      { name: 'page',     type: 'number', required: false, example: '1',      desc: '页码' },
    ],
  },
  {
    id: 'search-suggest', category: '搜索模块', name: '搜索建议',
    method: 'GET', path: '/api/search/suggest', requiresAuth: false,
    desc: '根据关键词返回自动补全建议',
    query: [{ name: 'q', type: 'string', required: true, example: '李', desc: '关键词前缀' }],
  },
]

export const CATEGORIES = [...new Set(API_DEFINITIONS.map((a) => a.category))]
