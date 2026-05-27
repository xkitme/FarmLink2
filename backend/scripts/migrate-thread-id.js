import { prisma } from '../src/db.js'

try {
  const rows = await prisma.aiQaRecord.findMany({
    where: { threadId: null },
    select: { id: true },
  })
  for (const row of rows) {
    await prisma.aiQaRecord.update({
      where: { id: row.id },
      data: { threadId: row.id },
    })
  }
  console.log(`migrate-thread-id done: ${rows.length}`)
} finally {
  await prisma.$disconnect()
}
