import { prisma } from '../src/db.js'

const map = {
  '求助': '互助求助',
  '互助': '互助求助',
  '提供帮助': '互助求助',
  '分享': '分享见闻',
}

try {
  let total = 0
  for (const [oldType, newType] of Object.entries(map)) {
    const result = await prisma.helpRequest.updateMany({
      where: { type: oldType },
      data: { type: newType },
    })
    total += result.count
    console.log(`${oldType} -> ${newType}: ${result.count}`)
  }
  console.log(`normalize-help-type done: ${total}`)
} finally {
  await prisma.$disconnect()
}
