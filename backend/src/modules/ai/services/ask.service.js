import { prisma } from '../../../db.js'
import { config } from '../../../config/index.js'
import { generateText } from './ollama.service.js'
import { buildPrompt, fallbackAnswer, systemPrompt } from './fallback.service.js'
import { searchLocalKnowledge } from './rag.service.js'

async function ensureThreadId(record, threadId) {
  if (threadId) return threadId
  await prisma.aiQaRecord.update({
    where: { id: record.id },
    data: { threadId: record.id },
  })
  return record.id
}

/** 完整问答编排：SQLite RAG → Ollama 模型 → 规则引擎。 */
export async function answerQuestion({ userId, scene = 'GENERAL', question, threadId = null }) {
  const normalized = String(scene || 'GENERAL').toUpperCase()
  const references = await searchLocalKnowledge(normalized, question, 5)
  const prompt = buildPrompt({ scene: normalized, question, references })

  let answer
  let serviceMode = '智能问答'
  let modelUsed = config.ollama.primaryModel
  let durationMs = null

  try {
    const result = await generateText({
      prompt,
      system: systemPrompt(normalized),
      model: config.ollama.primaryModel,
      temperature: 0.2,
    })
    answer = result.answer || fallbackAnswer({ scene: normalized, question, references })
    modelUsed = result.model
    durationMs = result.totalDurationMs
  } catch (err) {
    serviceMode = '智能问答'
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
