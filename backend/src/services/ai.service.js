import { config } from '../config/index.js'
import fs from 'fs'

const { baseUrl, primaryModel, visionModel } = config.ollama

const PROMPTS = {
  guide: `你是「文渊」，墨脉 App 的中华传统文化向导。
你精通诗词、书法、历史、国学、节气民俗等领域。
回答简洁准确，引经据典，语言典雅但易懂。
若不确定，直接说「此事尚需考证」，不要编造。`,

  confucius: `你现在扮演孔子（公元前551-479年），儒家创始人。
核心思想：仁、义、礼、智、信。
语言风格：文言文为主，可引用《论语》《春秋》等典籍。
称呼：称自己为「吾」，称对方为「汝」或「尔」。
不知道的事情说「吾不知也」，不编造史实。`,

  libai: `你现在扮演李白（701-762年），唐代浪漫主义诗人，自称「诗仙」。
性格豪放不羁，嗜酒，好仙道，蔑视权贵。
语言飘逸洒脱，可引用自己的诗作（《静夜思》《将进酒》等）。
称自己为「李某」或「吾」，语气潇洒自在。`,

  sushi: `你现在扮演苏轼（1037-1101年），北宋文豪，号东坡居士。
精通诗词书画，历经起伏仍旷达乐观。
语言风趣幽默，可引用《赤壁赋》《水调歌头》等作品。
称自己为「东坡」或「苏某」。`,

  poetry_helper: `你是诗词创作助手，帮助用户创作中国古典诗词。
掌握律诗（五律/七律）、绝句（五绝/七绝）、词牌的格律规则。
流程：先询问主题和情感 → 逐联辅助创作 → 检查平仄押韵 → 给出修改建议。
指出平仄问题时，直接给出具体替换词，不只说「此处平仄有误」。`,

  translation: `你是古汉语翻译专家。
收到古文后按以下格式输出：
【全文译文】（现代白话文）
【逐句解析】（关键词注释）
【创作背景】（作者和时代背景）
语言准确，不过度意译。`,
}

/**
 * 流式对话（返回 AsyncGenerator）
 */
export async function* streamChat(mode, messages, character) {
  const systemPrompt = PROMPTS[character || mode] || PROMPTS.guide

  const body = {
    model: primaryModel,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    stream: true,
    options: { temperature: 0.7, num_ctx: 4096 },
  }

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`Ollama error: ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const lines = decoder.decode(value).split('\n').filter(Boolean)
    for (const line of lines) {
      try {
        const json = JSON.parse(line)
        if (json.message?.content) yield json.message.content
      } catch {}
    }
  }
}

/**
 * 普通对话（非流式，返回完整文本）
 */
export async function chat(systemPrompt, userMessage, opts = {}) {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: primaryModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      stream: false,
      options: { temperature: 0.3, num_ctx: 4096, ...opts },
    }),
  })
  const data = await res.json()
  return data.message?.content || ''
}

/**
 * 书法图片点评（视觉模型）
 */
export async function reviewCalligraphy(imagePath) {
  const imageData = fs.readFileSync(imagePath).toString('base64')

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: visionModel,
      messages: [{
        role: 'user',
        content: '请点评这幅书法作品，用JSON格式返回，包含字段：style（字体风格）、structure（结构评分1-10）、strength（笔力评分1-10）、layout（章法评分1-10）、overall（总评文字）、suggestions（改进建议数组）',
        images: [imageData],
      }],
      stream: false,
      format: 'json',
    }),
  })

  const data = await res.json()
  try {
    return JSON.parse(data.message?.content || '{}')
  } catch {
    return { overall: data.message?.content, structure: 0, strength: 0, layout: 0 }
  }
}

/**
 * 生成测验题
 */
export async function generateQuiz(contentBody, count = 3) {
  const prompt = `根据以下内容生成${count}道测验题，返回JSON数组：
内容：${contentBody.slice(0, 800)}

格式：[{"question":"题目","options":["A.选项","B.选项","C.选项","D.选项"],"answer":"A","explanation":"解析"}]`

  const result = await chat('你是出题专家，只返回JSON，不要其他内容。', prompt, { temperature: 0.2 })
  try {
    const match = result.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch {
    return []
  }
}

/**
 * 生成学习周报
 */
export async function generateWeeklyReport(stats) {
  const prompt = `根据以下学习数据生成一份简短的学习周报（200字以内，鼓励为主）：
完成内容数：${stats.completedCount}
学习分类：${stats.categories.join('、')}
平均得分：${stats.avgScore}
连续打卡：${stats.streak}天
薄弱环节：${stats.weakPoints.join('、') || '暂无'}`

  return chat('你是学习导师，语言温和鼓励，简洁有力。', prompt, { temperature: 0.8 })
}

/**
 * 检查 Ollama 是否在线
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}
