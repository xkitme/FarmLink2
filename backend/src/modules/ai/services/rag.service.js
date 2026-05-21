import { prisma } from '../../../db.js'

function terms(text) {
  const clean = String(text || '').replace(/[^\p{Script=Han}a-zA-Z0-9]/gu, '')
  const set = new Set()
  for (const n of [4, 3, 2]) {
    for (let i = 0; i + n <= clean.length; i++) set.add(clean.slice(i, i + n))
  }
  String(text || '').split(/[,，、\s]+/).filter((x) => x.length >= 2).forEach((x) => set.add(x))
  return [...set].slice(0, 32)
}

function scoreText(text, tokens) {
  const source = String(text || '')
  return tokens.reduce((sum, token) => sum + (source.includes(token) ? Math.min(4, token.length) : 0), 0)
}

function excerpt(text, max = 180) {
  const s = String(text || '').replace(/\s+/g, ' ').trim()
  return s.length > max ? `${s.slice(0, max)}...` : s
}

async function policyRefs(question, limit) {
  const tokens = terms(question)
  if (!tokens.length) return []
  const chunks = await prisma.policyChunk.findMany({
    where: { OR: tokens.map((token) => ({ chunkContent: { contains: token } })) },
    take: 80,
  })
  const top = chunks
    .map((chunk) => ({ chunk, score: scoreText(chunk.chunkContent, tokens) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  const policies = await prisma.policy.findMany({
    where: { id: { in: [...new Set(top.map((x) => x.chunk.policyId))] } },
    select: { id: true, title: true, level: true, category: true, publishOrg: true },
  })
  const policyMap = Object.fromEntries(policies.map((p) => [p.id, p]))
  return top.map(({ chunk, score }) => ({
    type: 'policy',
    id: chunk.policyId,
    title: policyMap[chunk.policyId]?.title || `政策 ${chunk.policyId}`,
    meta: policyMap[chunk.policyId] || null,
    chunkIndex: chunk.chunkIndex,
    content: excerpt(chunk.chunkContent, 260),
    score,
  }))
}

async function agriRefs(question, limit) {
  const tokens = terms(question)
  if (!tokens.length) return []
  const [diseases, pesticides, calendars] = await Promise.all([
    prisma.diseaseKnowledge.findMany({
      where: { OR: tokens.map((token) => ({
        OR: [
          { diseaseName: { contains: token } },
          { cropType: { contains: token } },
          { symptoms: { contains: token } },
          { prevention: { contains: token } },
        ],
      })) },
      take: 60,
    }),
    prisma.pesticideInfo.findMany({
      where: { OR: tokens.map((token) => ({
        OR: [
          { name: { contains: token } },
          { cropType: { contains: token } },
          { targetPest: { contains: token } },
        ],
      })) },
      take: 40,
    }),
    prisma.farmCalendar.findMany({
      where: { OR: tokens.map((token) => ({
        OR: [
          { cropType: { contains: token } },
          { activity: { contains: token } },
          { description: { contains: token } },
        ],
      })) },
      take: 40,
    }),
  ])

  const refs = [
    ...diseases.map((d) => ({
      type: 'disease',
      id: d.id,
      title: `${d.cropType || '作物'}-${d.diseaseName}`,
      content: excerpt(`${d.symptoms || ''} ${d.prevention || ''} ${d.medicineAdvice || ''}`, 260),
      score: scoreText(`${d.diseaseName} ${d.cropType} ${d.symptoms} ${d.prevention}`, tokens),
    })),
    ...pesticides.map((p) => ({
      type: 'pesticide',
      id: p.id,
      title: p.name,
      content: excerpt(`登记证号：${p.regNo || '未知'}。防治对象：${p.targetPest || '未填写'}。安全用量：${p.safeDosage || '按标签执行'}。安全间隔期：${p.safeInterval || '按标签执行'}。`, 260),
      score: scoreText(`${p.name} ${p.cropType} ${p.targetPest}`, tokens),
    })),
    ...calendars.map((c) => ({
      type: 'calendar',
      id: c.id,
      title: `${c.month}月 ${c.cropType || '通用'} ${c.activity}`,
      content: excerpt(c.description, 220),
      score: scoreText(`${c.cropType} ${c.activity} ${c.description}`, tokens),
    })),
  ]
  return refs.filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, limit)
}

async function disasterRefs(question, limit) {
  const tokens = terms(question)
  if (!tokens.length) return []
  const guides = await prisma.emergencyGuide.findMany({
    where: { OR: tokens.map((token) => ({
      OR: [
        { title: { contains: token } },
        { disasterType: { contains: token } },
        { content: { contains: token } },
      ],
    })) },
    take: 40,
  })
  return guides
    .map((g) => ({
      type: 'emergency',
      id: g.id,
      title: g.title,
      content: excerpt(`${g.content || ''} ${g.steps || ''}`, 280),
      score: scoreText(`${g.title} ${g.disasterType} ${g.content}`, tokens),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

async function lifeRefs(question, limit) {
  const tokens = terms(question)
  if (!tokens.length) return []
  const [jobs, loans, courses] = await Promise.all([
    prisma.jobInfo.findMany({
      where: { OR: tokens.map((token) => ({
        OR: [{ title: { contains: token } }, { requirement: { contains: token } }, { company: { contains: token } }],
      })) },
      take: 30,
    }),
    prisma.loanProduct.findMany({
      where: { OR: tokens.map((token) => ({
        OR: [{ productName: { contains: token } }, { bankName: { contains: token } }, { requirement: { contains: token } }, { description: { contains: token } }],
      })) },
      take: 20,
    }),
    prisma.trainingCourse.findMany({
      where: { OR: tokens.map((token) => ({
        OR: [{ title: { contains: token } }, { content: { contains: token } }, { category: { contains: token } }],
      })) },
      take: 20,
    }),
  ])
  const refs = [
    ...jobs.map((j) => ({
      type: 'job',
      id: j.id,
      title: j.title,
      content: excerpt(`${j.company || ''} ${j.salary || ''} ${j.requirement || ''}`, 220),
      score: scoreText(`${j.title} ${j.company} ${j.requirement}`, tokens),
    })),
    ...loans.map((l) => ({
      type: 'loan',
      id: l.id,
      title: `${l.bankName}-${l.productName}`,
      content: excerpt(`最高额度 ${l.maxAmount} 元，年化利率约 ${l.interestRate}%，申请要求：${l.requirement || l.description || '以银行审核为准'}`, 220),
      score: scoreText(`${l.bankName} ${l.productName} ${l.requirement} ${l.description}`, tokens),
    })),
    ...courses.map((c) => ({
      type: 'course',
      id: c.id,
      title: c.title,
      content: excerpt(c.content, 220),
      score: scoreText(`${c.title} ${c.category} ${c.content}`, tokens),
    })),
  ]
  return refs.filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, limit)
}

/** 本地 SQLite 知识检索，比赛断网可用。 */
export async function searchLocalKnowledge(scene, question, limit = 5) {
  const normalized = String(scene || 'GENERAL').toUpperCase()
  if (normalized === 'POLICY') return policyRefs(question, limit)
  if (normalized === 'AGRI') return agriRefs(question, limit)
  if (normalized === 'DISASTER') return disasterRefs(question, limit)
  if (normalized === 'LIFE' || normalized === 'EDU' || normalized === 'LOAN') return lifeRefs(question, limit)
  if (normalized === 'LEGAL') {
    const refs = await policyRefs(question, Math.ceil(limit / 2))
    return refs.length ? refs : []
  }
  const groups = await Promise.all([
    policyRefs(question, 2),
    agriRefs(question, 2),
    disasterRefs(question, 1),
    lifeRefs(question, 1),
  ])
  return groups.flat().sort((a, b) => b.score - a.score).slice(0, limit)
}

export function referencesToPrompt(references) {
  if (!references.length) return '（本地知识库未检索到直接片段）'
  return references
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.content}`)
    .join('\n\n')
}
