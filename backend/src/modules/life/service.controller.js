import { prisma } from '../../db.js'
import { ok, errors } from '../../utils/response.js'
import { parseJson } from '../../utils/page.js'

// ── 快递代收站 ──────────────────────────────

/** 代收点列表 */
export async function expressList(req, res) {
  const where = {}
  if (req.query.regionCode) where.regionCode = req.query.regionCode
  const rows = await prisma.expressPoint.findMany({ where, orderBy: { id: 'asc' } })
  ok(res, rows)
}

/** 快递查询（离线 mock） */
export async function expressQuery(req, res) {
  const no = String(req.query.no || '').trim()
  if (!no) throw errors.param('请输入快递单号')
  const statuses = ['已揽收', '运输中', '已到达代收点', '待取件']
  ok(res, {
    expressNo: no,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    traces: [
      { time: new Date(Date.now() - 2 * 86400000), desc: '快件已揽收' },
      { time: new Date(Date.now() - 86400000), desc: '运输中，已发往目的地' },
      { time: new Date(), desc: '快件已到达【松华村快递服务点】，请凭取件码取件' },
    ],
    tip: '本地离线数据；实际请以快递公司信息为准。',
  })
}

// ── 水电气缴费 ──────────────────────────────

const UTILITY = { electric: '电费', water: '水费', gas: '燃气费' }

/** 查询账单 */
export async function utilityBill(req, res) {
  const type = req.query.type || 'electric'
  if (!UTILITY[type]) throw errors.param('账单类型不支持')
  const amount = Number((20 + Math.random() * 120).toFixed(2))
  ok(res, {
    type,
    typeName: UTILITY[type],
    period: new Date().toISOString().slice(0, 7),
    amount,
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    status: 'UNPAID',
  })
}

/** 缴费（离线 mock） */
export async function utilityPay(req, res) {
  const { type, amount } = req.body
  if (!UTILITY[type] || !amount) throw errors.param('请选择账单类型并填写金额')
  ok(res, {
    type,
    typeName: UTILITY[type],
    amount: Number(amount),
    orderNo: 'PAY' + Date.now(),
    paidAt: new Date(),
    status: 'PAID',
  }, `${UTILITY[type]}缴费成功`)
}

// ── 乡村旅游推广 ────────────────────────────

/** 旅游景点列表 */
export async function tourismList(req, res) {
  const where = {}
  if (req.query.spotType) where.spotType = req.query.spotType
  if (req.query.regionCode) where.regionCode = req.query.regionCode
  const rows = await prisma.tourismSpot.findMany({ where, orderBy: { rating: 'desc' } })
  ok(res, rows.map((t) => ({ ...t, images: parseJson(t.images, []) })))
}

/** 旅游景点详情 */
export async function tourismDetail(req, res) {
  const t = await prisma.tourismSpot.findUnique({ where: { id: Number(req.params.id) } })
  if (!t) throw errors.notFound('景点不存在')
  ok(res, { ...t, images: parseJson(t.images, []) })
}

/** 发布旅游景点 */
export async function tourismCreate(req, res) {
  const { name, spotType, address, description, price, phone, images } = req.body
  if (!name) throw errors.param('景点名称必填')
  const t = await prisma.tourismSpot.create({
    data: {
      name,
      spotType: spotType || '农家乐',
      regionCode: req.user.regionCode || null,
      address: address || null,
      description: description || null,
      price: price != null ? Number(price) : null,
      phone: phone || null,
      images: images ? JSON.stringify(images) : null,
    },
  })
  ok(res, t, '景点已发布')
}

/** 旅游推广文案生成（离线模板，分段 11 接入 LLM） */
export async function tourismPromote(req, res) {
  const { name, spotType, highlights } = req.body
  if (!name) throw errors.param('请填写景点名称')
  const hl = Array.isArray(highlights) ? highlights.join('、') : (highlights || '田园风光、地道农家味')
  ok(res, {
    name,
    promoText:
      `【${name}】——${hl}。\n` +
      `远离城市喧嚣，来${name}过几天慢生活：呼吸新鲜空气，品尝时令果蔬，体验农事乐趣。\n` +
      `${spotType === '民宿' ? '推窗见景，安睡田园。' : '柴火饭菜香，亲子好去处。'}周末就来，给生活换个风景。`,
    tags: ['乡村游', '亲子体验', '生态田园', '周末好去处'],
    tip: '本文案为模板生成，分段 11 接入本地大模型后可智能生成。',
  }, '推广文案已生成')
}
