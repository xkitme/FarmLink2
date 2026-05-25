import { prisma } from '../../../db.js'
import { config } from '../../../config/index.js'
import { generateText } from './ollama.service.js'
import { buildPrompt, fallbackAnswer, systemPrompt } from './fallback.service.js'
import { searchLocalKnowledge } from './rag.service.js'

/** 完整问答编排：SQLite RAG → Ollama 模型 → 规则引擎。 */
export async function answerQuestion({ userId, scene = 'GENERAL', question }) {
  const normalized = String(scene || 'GENERAL').toUpperCase()
  const references = await searchLocalKnowledge(normalized, question, 5)
  const prompt = buildPrompt({ scene: normalized, question, references })

  let answer
  let mode = 'ollama-rag'
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
    mode = 'rule-rag'
    modelUsed = 'rule-rag'
    answer = fallbackAnswer({ scene: normalized, question, references })
  }

  const record = await prisma.aiQaRecord.create({
    data: {
      userId,
      scene: normalized,
      question,
      answer,
      modelUsed,
      isOffline: true,
      referencesJson: JSON.stringify(references),
    },
  })

  return {
    recordId: record.id,
    scene: normalized,
    question,
    answer,
    references,
    mode,
    modelUsed,
    durationMs,
    offline: true,
  }
}
