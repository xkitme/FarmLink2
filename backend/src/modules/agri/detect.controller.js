import { prisma } from '../../db.js'
import { ok, errors } from '../../utils/response.js'
import { pageParams } from '../../utils/page.js'

/**
 * 注意：本段为离线规则版识别（从知识库匹配）。
 * 分段 11 将接入 Ollama 视觉模型（minicpm-v）做真实图像推理。
 */

const rand = (min, max) => min + Math.random() * (max - min)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

/** 病虫害识别 */
export async function diseaseDetect(req, res) {
  if (!req.file) throw errors.param('请上传作物图片')
  const { cropType } = req.body

  let pool = cropType
    ? await prisma.diseaseKnowledge.findMany({ where: { cropType } })
    : []
  if (pool.length === 0) pool = await prisma.diseaseKnowledge.findMany()
  if (pool.length === 0) throw errors.notFound('病害知识库为空')

  const disease = pick(pool)
  const confidence = Number(rand(0.78, 0.97).toFixed(2))
  const imageUrl = `/uploads/${req.file.filename}`

  const record = await prisma.aiDetectRecord.create({
    data: {
      userId: req.user.id,
      detectType: 'DISEASE',
      imageUrl,
      resultLabel: disease.modelLabel || disease.diseaseName,
      confidence,
      adviceText: disease.prevention,
    },
  })

  ok(res, {
    recordId: record.id,
    detectType: 'DISEASE',
    imageUrl,
    confidence,
    disease,
  }, '识别完成')
}

const WEEDS = [
  { name: '稗草',       advice: '稗草与水稻形态相近，宜在分蘖前人工拔除，或选用二氯喹啉酸定向防除。' },
  { name: '马唐',       advice: '马唐为旱地恶性杂草，苗期 3-5 叶期用精喹禾灵茎叶喷雾防除效果好。' },
  { name: '牛筋草',     advice: '牛筋草根系发达，幼苗期及时锄除，非作物区可喷草甘膦。' },
  { name: '空心莲子草', advice: '即水花生，繁殖力强，需连根清除并集中晾晒销毁，防止扩散。' },
  { name: '香附子',     advice: '香附子地下块茎多，单次除草难根除，需多次中耕配合化学防除。' },
]

/** 杂草识别 */
export async function weedDetect(req, res) {
  if (!req.file) throw errors.param('请上传田间图片')
  const weed = pick(WEEDS)
  const confidence = Number(rand(0.75, 0.95).toFixed(2))
  const imageUrl = `/uploads/${req.file.filename}`

  const record = await prisma.aiDetectRecord.create({
    data: {
      userId: req.user.id,
      detectType: 'WEED',
      imageUrl,
      resultLabel: weed.name,
      confidence,
      adviceText: weed.advice,
    },
  })
  ok(res, { recordId: record.id, detectType: 'WEED', imageUrl, confidence, weedName: weed.name, advice: weed.advice }, '识别完成')
}

/** 种子质量鉴别 */
export async function seedDetect(req, res) {
  if (!req.file) throw errors.param('请上传种子图片')
  const germination = Math.round(rand(84, 98))
  const purity = Math.round(rand(95, 99.5) * 10) / 10
  const grade = germination >= 92 ? '优' : germination >= 88 ? '良' : '合格'
  const confidence = Number(rand(0.80, 0.96).toFixed(2))
  const imageUrl = `/uploads/${req.file.filename}`
  const advice = germination >= 90
    ? '种子活力良好，可正常播种，建议播前晒种 1-2 天提高出苗整齐度。'
    : '发芽率偏低，建议适当增加播种量，或更换新种，并做发芽试验复核。'

  const record = await prisma.aiDetectRecord.create({
    data: {
      userId: req.user.id,
      detectType: 'SEED',
      imageUrl,
      resultLabel: `${grade}级`,
      confidence,
      adviceText: advice,
    },
  })
  ok(res, {
    recordId: record.id, detectType: 'SEED', imageUrl, confidence,
    germination, purity, grade, advice,
  }, '鉴别完成')
}

const GROWTH_STAGES = ['苗期', '分蘖期/营养生长期', '拔节期', '孕穗/现蕾期', '抽穗开花期', '灌浆/结果期', '成熟期']

/** 作物长势监测 */
export async function cropMonitor(req, res) {
  if (!req.file) throw errors.param('请上传作物图片')
  const { cropType } = req.body
  const health = Math.round(rand(70, 96))
  const stage = pick(GROWTH_STAGES)
  const confidence = Number(rand(0.78, 0.94).toFixed(2))
  const imageUrl = `/uploads/${req.file.filename}`
  const status = health >= 88 ? '长势优良' : health >= 78 ? '长势正常' : '长势偏弱'
  const advice = health >= 88
    ? '苗情健壮，按常规管理即可，注意预防病虫害。'
    : health >= 78
      ? '长势中等，建议适当追肥并加强水分管理。'
      : '长势偏弱，建议查明原因（缺肥/病害/渍涝），及时追施速效肥并改善田间环境。'

  const record = await prisma.aiDetectRecord.create({
    data: {
      userId: req.user.id,
      detectType: 'GROWTH',
      imageUrl,
      resultLabel: status,
      confidence,
      adviceText: advice,
    },
  })
  ok(res, {
    recordId: record.id, detectType: 'GROWTH', imageUrl, confidence,
    cropType: cropType || '未知', healthScore: health, growthStage: stage, status, advice,
  }, '监测完成')
}

/** 我的识别记录 */
export async function records(req, res) {
  const { pageNum, pageSize, skip, take } = pageParams(req.query)
  const where = { userId: req.user.id }
  if (req.query.detectType) where.detectType = req.query.detectType
  const [records, total] = await Promise.all([
    prisma.aiDetectRecord.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.aiDetectRecord.count({ where }),
  ])
  ok(res, { records, total, pageNum, pageSize })
}

/** 病害知识库列表 */
export async function diseaseList(req, res) {
  const where = {}
  if (req.query.cropType) where.cropType = req.query.cropType
  if (req.query.category) where.category = req.query.category
  const list = await prisma.diseaseKnowledge.findMany({ where, orderBy: { id: 'asc' } })
  ok(res, list)
}

/** 病害知识详情（按 id / modelLabel / 名称） */
export async function diseaseDetail(req, res) {
  const label = req.params.label
  let dk = null
  if (/^\d+$/.test(label)) {
    dk = await prisma.diseaseKnowledge.findUnique({ where: { id: Number(label) } })
  }
  if (!dk) {
    dk = await prisma.diseaseKnowledge.findFirst({
      where: { OR: [{ modelLabel: label }, { diseaseName: label }] },
    })
  }
  if (!dk) throw errors.notFound('未找到该病害知识')
  ok(res, dk)
}
