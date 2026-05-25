import { prisma } from '../../db.js'
import { ok, errors } from '../../utils/response.js'

/** 实时价格行情（不指定单品则每品返回最新一条） */
export async function priceList(req, res) {
  const where = {}
  if (req.query.category) where.category = req.query.category
  if (req.query.productName) where.productName = req.query.productName

  const rows = await prisma.marketPrice.findMany({
    where,
    orderBy: { priceDate: 'desc' },
    take: 300,
  })
  if (req.query.productName) return ok(res, rows)

  const latest = new Map()
  for (const r of rows) if (!latest.has(r.productName)) latest.set(r.productName, r)
  ok(res, [...latest.values()])
}

/** 单品价格走势 */
export async function priceTrend(req, res) {
  const productName = req.query.productName
  if (!productName) throw errors.param('请指定农产品名称')
  const rows = await prisma.marketPrice.findMany({
    where: { productName },
    orderBy: { priceDate: 'asc' },
  })
  if (rows.length === 0) throw errors.notFound('暂无该农产品行情数据')
  const prices = rows.map((r) => r.price)
  ok(res, {
    productName,
    unit: rows[0].unit,
    points: rows.map((r) => ({ date: r.priceDate, price: r.price })),
    high: Math.max(...prices),
    low: Math.min(...prices),
    avg: Number((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)),
  })
}

/** 价格趋势预测 */
export async function pricePredict(req, res) {
  const where = {}
  if (req.query.productName) where.productName = req.query.productName
  const list = await prisma.pricePrediction.findMany({
    where,
    orderBy: { predictDate: 'asc' },
  })
  ok(res, list)
}

/** 期货行情参考 */
export async function futures(req, res) {
  const base = [
    { contract: '玉米 2609',   exchange: '大连商品交易所', anchor: 2480 },
    { contract: '豆粕 2609',   exchange: '大连商品交易所', anchor: 3120 },
    { contract: '白糖 2609',   exchange: '郑州商品交易所', anchor: 6050 },
    { contract: '棉花 2609',   exchange: '郑州商品交易所', anchor: 14200 },
    { contract: '生猪 2609',   exchange: '大连商品交易所', anchor: 15800 },
    { contract: '菜籽油 2609', exchange: '郑州商品交易所', anchor: 9300 },
  ]
  const list = base.map((f) => {
    const change = Number(((Math.random() - 0.5) * f.anchor * 0.04).toFixed(0))
    const price = f.anchor + change
    return {
      contract: f.contract,
      exchange: f.exchange,
      price,
      change,
      changePct: Number(((change / f.anchor) * 100).toFixed(2)),
      unit: '元/吨',
    }
  })
  ok(res, {
    updatedAt: new Date(),
    list,
    tip: '期货价格仅供种植与销售决策参考，行情波动较大，请理性看待。',
  })
}

/** 出口合规查询 */
const EXPORT_RULES = {
  柑橘: {
    standard: 'GB 2763 食品安全国家标准 农药最大残留限量',
    quarantine: '需经出入境检验检疫，重点检测溃疡病、实蝇等检疫性有害生物',
    docs: ['植物检疫证书', '原产地证明', '出口检验检疫合格证'],
    tip: '出口前需在海关备案果园和包装厂，采收后规范预冷与处理。',
  },
  猕猴桃: {
    standard: 'GB 2763 + 进口国农残限量（如欧盟 EC 396/2005）',
    quarantine: '检测果实蝇、软腐病，需冷处理或熏蒸',
    docs: ['植物检疫证书', '原产地证明', '出口企业备案证明'],
    tip: '注意进口国对硬度、可溶性固形物的等级要求。',
  },
  茶叶: {
    standard: 'GB 2763 + 目标市场农残与重金属限量',
    quarantine: '检测农药残留、稀土、重金属铅等指标',
    docs: ['植物检疫证书', '卫生证书', '原产地证明'],
    tip: '出口茶园需通过备案，严控农药使用与采摘卫生。',
  },
}

export async function exportCompliance(req, res) {
  const product = String(req.query.product || '').trim()
  if (!product) throw errors.param('请指定农产品名称')
  const rule = EXPORT_RULES[product]
  if (rule) return ok(res, { product, ...rule })
  ok(res, {
    product,
    standard: 'GB 2763 食品安全国家标准 农药最大残留限量',
    quarantine: '一般农产品出口需经出入境检验检疫，检测农残与检疫性有害生物',
    docs: ['植物检疫证书', '原产地证明', '出口检验检疫合格证'],
    tip: '建议出口前咨询当地海关，确认目标市场的具体准入要求。',
  })
}
