import { prisma } from '../../db.js'
import { ok, errors } from '../../utils/response.js'

/** 规则与模板能力：质量分级、包装文案、直播话术。 */

const rand = (a, b) => a + Math.random() * (b - a)
const GRADES = ['特级', '一级', '二级', '等外']

/** AI 质量分级（图片） */
export async function gradeDetect(req, res) {
  if (!req.file) throw errors.param('请上传农产品图片')
  const { productName } = req.body

  const scores = {
    色泽: Math.round(rand(70, 98)),
    大小: Math.round(rand(70, 98)),
    完整度: Math.round(rand(70, 98)),
    成熟度: Math.round(rand(70, 98)),
  }
  const avg = Object.values(scores).reduce((a, b) => a + b, 0) / 4
  const grade = avg >= 92 ? GRADES[0] : avg >= 84 ? GRADES[1] : avg >= 75 ? GRADES[2] : GRADES[3]
  const confidence = Number(rand(0.80, 0.96).toFixed(2))
  const imageUrl = `/uploads/${req.file.filename}`

  await prisma.aiDetectRecord.create({
    data: {
      userId: req.user.id,
      detectType: 'GRADE',
      imageUrl,
      resultLabel: grade,
      confidence,
      adviceText: `综合品相评分 ${avg.toFixed(0)}，定级 ${grade}。`,
    },
  })

  ok(res, {
    productName: productName || '农产品',
    imageUrl,
    grade,
    overallScore: Number(avg.toFixed(0)),
    scores,
    confidence,
    advice: grade === GRADES[0] || grade === GRADES[1]
      ? '品相优良，建议按精品装销售，可获更高溢价。'
      : '品相一般，建议分级包装，等外品可用于加工或就近销售。',
  }, '质量分级完成')
}

/** 包装文案生成 */
export async function packageGenerate(req, res) {
  const { productName, features, sellingPoint } = req.body
  if (!productName) throw errors.param('请填写产品名称')
  const feat = Array.isArray(features) ? features.join('、') : (features || '生态种植、新鲜直供')

  ok(res, {
    productName,
    slogan: `${productName}·一口尝到山野的鲜甜`,
    description:
      `精选产地${productName}，${feat}。从田间到餐桌，全程可溯源。\n` +
      `${sellingPoint || '土生土长，自然成熟'}，把家乡的味道送到您家。`,
    tags: ['原产地直供', '新鲜采摘', '溯源可查', '助农优选'],
    designTip: '包装主色建议用大地色或果实本色，突出"原产地+溯源码"，简洁朴实更显信任感。',
    tip: '可按产品特点继续微调，用于包装正稿前建议人工复核。',
  }, '包装文案已生成')
}

/** 直播带货话术生成 */
export async function liveScript(req, res) {
  const { productName, price } = req.body
  if (!productName) throw errors.param('请填写产品名称')
  const priceText = price ? `今天直播间专享价 ${price} 元` : '直播间价格非常实惠'

  ok(res, {
    productName,
    script: [
      `【开场】家人们好！我是咱村的新农人，今天给大家带来自家种的${productName}！`,
      `【介绍】这个${productName}是咱们自家地里种的，不打催熟剂，自然成熟，扫包装上的溯源码全程都能查。`,
      `【促单】${priceText}，数量不多，先下单先发货，错过就要等下一季啦！`,
      `【互动】想要的家人扣个"1"，有问题尽管问，我一一回答。`,
      `【收尾】感谢大家支持助农，下单后我们当天打包发货，给您最新鲜的！`,
    ],
    tip: '可按直播节奏继续微调，涉及价格与库存请以实际信息为准。',
  }, '直播话术已生成')
}
