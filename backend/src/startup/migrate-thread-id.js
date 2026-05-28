import { prisma } from '../db.js'

export async function migrateThreadIds() {
  try {
    const pending = await prisma.aiQaRecord.count({
      where: { threadId: null },
    })
    if (pending === 0) return 0

    const result = await prisma.$executeRawUnsafe(
      'UPDATE t_ai_qa_record SET threadId = id WHERE threadId IS NULL',
    )
    return Number(result || pending)
  } catch (e) {
    console.warn('迁移 AI 记录 threadId 启动钩子失败:', e.message)
    return 0
  }
}
