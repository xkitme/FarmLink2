import { prisma } from '../../../db.js'
import { config } from '../../../config/index.js'
import { generateText } from './ollama.service.js'
import { buildPrompt, fallbackAnswer, systemPrompt } from './fallback.service.js'
import { searchLocalKnowledge } from './rag.service.js'
import { loadAssistantConfig, providerPlan } from './assistant-config.service.js'
import { deepseekGenerate } from './deepseek.service.js'

async function ensureThreadId(record, threadId) {
  if (threadId) return threadId
  await prisma.aiQaRecord.update({
    where: { id: record.id },
    data: { threadId: record.id },
  })
  return record.id
}

/** 完整问答编排：SQLite RAG →（按面板选的提供方）DeepSeek / Ollama → 规则引擎。 */
export async function answerQuestion({ userId, scene = 'GENERAL', question, threadId = null }) {
  const normalized = String(scene || 'GENERAL').toUpperCase()
  const references = await searchLocalKnowledge(normalized, question, 5)
  const prompt = buildPrompt({ scene: normalized, question, references })
  const sys = systemPrompt(normalized)

  const cfg = await loadAssistantConfig()
  const { useDeepSeek, useOllama } = providerPlan(cfg.chatProvider)

  let answer
  let serviceMode = '智能问答'
  let modelUsed = config.ollama.primaryModel
  let durationMs = null

  // 1) DeepSeek（面板选 auto/deepseek 且已配置 key）
  if (useDeepSeek && cfg.deepseekApiKey) {
    try {
      const result = await deepseekGenerate({
        apiKey: cfg.deepseekApiKey,
        baseUrl: cfg.deepseekBaseUrl,
        model: cfg.deepseekModel,
        system: sys,
        prompt,
        temperature: 0.3,
        thinking: cfg.deepseekThinking,
      })
      answer = result.text
      modelUsed = result.model
    } catch {
      // 落到下一档
    }
  }

  // 2) 本地 Ollama（面板选 auto/ollama，或 DeepSeek 失败回落）
  if (!answer && useOllama) {
    try {
      const result = await generateText({
        prompt,
        system: sys,
        model: config.ollama.primaryModel,
        temperature: 0.2,
      })
      answer = result.answer
      modelUsed = result.model
      durationMs = result.totalDurationMs
    } catch {
      // 落到规则兜底
    }
  }

  // 3) 规则引擎兜底
  if (!answer) {
    modelUsed = 'knowledge-rule'
    answer = fallbackAnswer({ scene: normalized, question, references })
  }

  const record = await prisma.aiQaRecord.create({
    data: {
      userId,
      threadId,
      scene: normalized,
      question,
      answer,
      modelUsed,
      isOffline: true,
      referencesJson: JSON.stringify(references),
    },
  })
  const finalThreadId = await ensureThreadId(record, threadId)

  return {
    recordId: record.id,
    threadId: finalThreadId,
    scene: normalized,
    question,
    answer,
    references,
    serviceMode,
    modelUsed,
    durationMs,
    serviceStatus: '运行中',
  }
}
