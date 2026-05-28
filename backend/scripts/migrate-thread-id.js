import { migrateThreadIds } from '../src/startup/migrate-thread-id.js'
import { prisma } from '../src/db.js'

try {
  const count = await migrateThreadIds()
  console.log(`migrate-thread-id done: ${count}`)
} finally {
  await prisma.$disconnect()
}
