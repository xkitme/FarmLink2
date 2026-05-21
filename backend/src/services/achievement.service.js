import { prisma } from '../app.js'

const EXP_TABLE = [0, 200, 600, 1500, 3500, 8000, 18000, 40000, 90000, 200000]
const LEVEL_NAMES = ['白丁', '学童', '秀才', '举人', '进士', '翰林', '博士', '大儒', '宗师', '状元']

export async function addExp(userId, amount) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { expPoints: { increment: amount } },
  })

  const newLevel = EXP_TABLE.findLastIndex((exp) => user.expPoints >= exp) + 1
  if (newLevel !== user.level) {
    await prisma.user.update({ where: { id: userId }, data: { level: newLevel } })
  }

  return { expPoints: user.expPoints, level: newLevel, levelName: LEVEL_NAMES[newLevel - 1] }
}

export async function checkAndUnlock(userId, eventType, value) {
  const achievements = await prisma.achievement.findMany({
    where: { conditionType: eventType },
  })

  const unlocked = []

  for (const ach of achievements) {
    if (value < ach.conditionValue) continue

    const exists = await prisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId: ach.id } },
    })
    if (exists) continue

    await prisma.userAchievement.create({ data: { userId, achievementId: ach.id } })
    await addExp(userId, ach.expReward)
    unlocked.push(ach)
  }

  return unlocked
}
