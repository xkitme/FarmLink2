import { prisma } from '../db.js'

export async function migrateThreadIds() {
  try {
    const rows = await prisma.aiQaRecord.findMany({
      where: { threadId: null },
      select: { id: true },
    })
    if (!rows.length) return 0

    let success = 0
    for (const row of rows) {
      try {
        await prisma.aiQaRecord.update({
          where: { id: row.id },
          data: { threadId: row.id },
        })
        success++
      } catch (e) {
        console.warn(`迁移 AI 记录 ${row.id} threadId 失败: ${e.message}`)
      }
    }
    return success
  } catch (e) {
    console.warn('迁移 AI 记录 threadId 启动钩子失败:', e.message)
    return 0
  }
}
