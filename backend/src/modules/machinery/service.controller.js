import { prisma } from '../../db.js'
import { ok, errors } from '../../utils/response.js'

// ── 农机保险投保 ────────────────────────────

/** 投保 */
export async function insuranceCreate(req, res) {
  const { machineryId, insuranceType, premium, coverage, startDate, endDate } = req.body
  if (!insuranceType) throw errors.param('请选择险种')
  const ins = await prisma.machineryInsurance.create({
    data: {
      userId: req.user.id,
      machineryId: machineryId ? Number(machineryId) : null,
      insuranceType,
      premium: Number(premium) || 0,
      coverage: Number(coverage) || 0,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : new Date(Date.now() + 365 * 86400000),
      status: 'ACTIVE',
    },
  })
  ok(res, ins, '投保成功')
}

/** 我的保单 */
export async function insuranceList(req, res) {
  const rows = await prisma.machineryInsurance.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
  })
  ok(res, rows)
}

// ── 机手技能认证 ────────────────────────────

/** 申请机手认证 */
export async function certApply(req, res) {
  const { realName, certType, certNo, machineTypes } = req.body
  if (!realName || !certType) throw errors.param('真实姓名与认证类型必填')

  const exist = await prisma.operatorCert.findFirst({
    where: { userId: req.user.id, certType, status: { in: ['PENDING', 'APPROVED'] } },
  })
  if (exist) throw errors.param('该类型认证已在审核或已通过')

  const cert = await prisma.operatorCert.create({
    data: {
      userId: req.user.id,
      realName,
      certType,
      certNo: certNo || null,
      machineTypes: machineTypes || null,
      status: 'PENDING',
    },
  })
  ok(res, cert, '认证申请已提交，等待审核')
}

/** 认证列表（默认我的；管理可查全部） */
export async function certList(req, res) {
  const where = {}
  if (req.query.all === '1' && req.user.role === 'ADMIN') {
    if (req.query.status) where.status = req.query.status
  } else {
    where.userId = req.user.id
  }
  const rows = await prisma.operatorCert.findMany({
    where, orderBy: { createdAt: 'desc' },
  })
  ok(res, rows)
}
