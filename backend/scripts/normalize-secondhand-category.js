import { prisma } from '../src/db.js'

const map = {
  SHARE: '闲置共享',
  SELL: '二手交易',
}

try {
  let total = 0
  for (const [oldCategory, newCategory] of Object.entries(map)) {
    const result = await prisma.secondhandItem.updateMany({
      where: { category: oldCategory },
      data: { category: newCategory },
    })
    total += result.count
    console.log(`${oldCategory} -> ${newCategory}: ${result.count}`)
  }
  console.log(`normalize-secondhand-category done: ${total}`)
} finally {
  await prisma.$disconnect()
}
