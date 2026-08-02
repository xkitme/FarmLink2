import { execFileSync } from 'node:child_process'
import { closeSync, mkdtempSync, openSync, rmSync } from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import jwt from 'jsonwebtoken'

const backendRoot = path.resolve(import.meta.dirname, '..')
const testRoot = mkdtempSync(path.join(backendRoot, 'prisma', '.test-auth-'))
closeSync(openSync(path.join(testRoot, 'auth.db'), 'w'))
process.env.DATABASE_URL = `file:./${path.basename(testRoot)}/auth.db`
process.env.APP_ENV = 'dev'

const prismaCli = path.join(backendRoot, 'node_modules', 'prisma', 'build', 'index.js')
execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'], {
  cwd: backendRoot,
  env: process.env,
  stdio: 'pipe',
})

// 模拟历史 db push 数据库：列已存在，但迁移历史没有对应记录。
const { PrismaClient: MigrationProbeClient } = await import('@prisma/client')
const migrationProbe = new MigrationProbeClient()
await migrationProbe.$executeRawUnsafe(
  `DELETE FROM "_prisma_migrations" WHERE migration_name = ?`,
  '20260802115000_add_password_changed_at',
)
await migrationProbe.$disconnect()
execFileSync(process.execPath, [path.join(backendRoot, 'scripts', 'migrate-safe.mjs')], {
  cwd: backendRoot,
  env: process.env,
  stdio: 'pipe',
})

const [{ default: app }, { prisma }, { default: bcrypt }] = await Promise.all([
  import('../src/app.js'),
  import('../src/db.js'),
  import('bcryptjs'),
])

let server
let baseUrl
let requestSequence = 1

async function api(method, pathName, body, token) {
  const response = await fetch(`${baseUrl}/api/v1${pathName}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Device-Name': 'security-test-device',
      'X-Forwarded-For': `phase-b-test-${requestSequence++}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return {
    status: response.status,
    payload: await response.json(),
  }
}

before(async () => {
  const passwordHash = await bcrypt.hash('old-password', 4)
  await prisma.user.createMany({
    data: [
      {
        username: 'security-admin',
        nickname: '安全管理员',
        passwordHash,
        role: 'ADMIN',
      },
      {
        username: 'security-farmer',
        nickname: '测试农户',
        passwordHash,
        role: 'FARMER',
      },
    ],
  })
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await prisma.$disconnect()
  rmSync(testRoot, { recursive: true, force: true })
})

test('Phase B 认证、会话轮换与一次性重置码闭环', async (t) => {
  await t.test('公开注册不能写入角色和区域', async () => {
    const result = await api('POST', '/auth/register', {
      username: 'security-register',
      password: 'register-password',
      displayName: '新农户',
      role: 'ADMIN',
      regionCode: 'ALL',
      villageName: '全域',
    })
    assert.equal(result.status, 200)
    const user = await prisma.user.findUnique({ where: { username: 'security-register' } })
    assert.equal(user.role, 'FARMER')
    assert.equal(user.regionCode, null)
    assert.equal(user.villageName, null)
  })

  let farmerSession
  let rotatedSession
  let adminSession

  await t.test('登录建立持久会话，refresh 轮换并立即撤销旧会话', async () => {
    const login = await api('POST', '/auth/login', {
      username: 'security-farmer',
      password: 'old-password',
      deviceName: '农户测试机',
    })
    assert.equal(login.status, 200)
    farmerSession = login.payload.data
    assert.ok(farmerSession.token)
    assert.ok(farmerSession.refreshToken)

    const sessions = await api('GET', '/auth/sessions', null, farmerSession.token)
    assert.equal(sessions.status, 200)
    assert.equal(sessions.payload.data.length, 1)
    assert.equal(sessions.payload.data[0].current, true)

    const refresh = await api('POST', '/auth/refresh', {
      refreshToken: farmerSession.refreshToken,
      deviceName: '农户测试机',
    })
    assert.equal(refresh.status, 200)
    rotatedSession = refresh.payload.data
    assert.notEqual(rotatedSession.refreshToken, farmerSession.refreshToken)

    assert.equal((await api('GET', '/user/profile', null, farmerSession.token)).status, 401)
    assert.equal((await api('POST', '/auth/refresh', {
      refreshToken: farmerSession.refreshToken,
    })).status, 401)
    assert.equal((await api('GET', '/user/profile', null, rotatedSession.token)).status, 200)
  })

  await t.test('同一 refresh 并发轮换只允许一个后继会话', async () => {
    const login = await api('POST', '/auth/login', {
      username: 'security-farmer',
      password: 'old-password',
      deviceName: '并发刷新测试机',
    })
    assert.equal(login.status, 200)

    const original = login.payload.data
    const originalClaims = jwt.decode(original.refreshToken)
    const attempts = await Promise.all([
      api('POST', '/auth/refresh', { refreshToken: original.refreshToken }),
      api('POST', '/auth/refresh', { refreshToken: original.refreshToken }),
    ])
    const succeeded = attempts.filter((item) => item.status === 200)
    const rejected = attempts.filter((item) => item.status === 401)
    assert.equal(succeeded.length, 1)
    assert.equal(rejected.length, 1)

    const successor = succeeded[0].payload.data
    const successorClaims = jwt.decode(successor.refreshToken)
    const sessions = await prisma.authSession.findMany({
      where: { id: { in: [originalClaims.sid, successorClaims.sid] } },
      orderBy: { createdAt: 'asc' },
    })
    assert.equal(sessions.length, 2)
    assert.ok(sessions.find((item) => item.id === originalClaims.sid)?.revokedAt)
    assert.equal(sessions.find((item) => item.id === successorClaims.sid)?.revokedAt, null)
    assert.equal((await api('GET', '/user/profile', null, original.token)).status, 401)
    assert.equal((await api('POST', '/auth/refresh', {
      refreshToken: original.refreshToken,
    })).status, 401)
    assert.equal((await api('GET', '/user/profile', null, successor.token)).status, 200)
  })

  await t.test('个人资料接口不能修改账号行政区划', async () => {
    const before = await prisma.user.findUnique({ where: { username: 'security-farmer' } })
    const result = await api('PUT', '/user/profile', {
      regionCode: 'ADMIN-ALL',
    }, rotatedSession.token)
    assert.equal(result.status, 403)

    const after = await prisma.user.findUnique({ where: { username: 'security-farmer' } })
    assert.equal(after.regionCode, before.regionCode)
  })

  await t.test('退出会撤销当前设备会话', async () => {
    assert.equal((await api('POST', '/auth/logout', {}, rotatedSession.token)).status, 200)
    assert.equal((await api('GET', '/user/profile', null, rotatedSession.token)).status, 401)
  })

  await t.test('access 不可用时可用 refresh 幂等撤销当前会话', async () => {
    const login = await api('POST', '/auth/login', {
      username: 'security-farmer',
      password: 'old-password',
      deviceName: 'refresh 退出测试机',
    })
    assert.equal(login.status, 200)
    const session = login.payload.data

    assert.equal((await api('POST', '/auth/logout', {
      refreshToken: session.refreshToken,
    })).status, 200)
    assert.equal((await api('POST', '/auth/logout', {
      refreshToken: session.refreshToken,
    })).status, 200)
    assert.equal((await api('GET', '/user/profile', null, session.token)).status, 401)
    assert.equal((await api('POST', '/auth/refresh', {
      refreshToken: session.refreshToken,
    })).status, 401)
  })

  await t.test('只有 ADMIN 能生成重置码，错误五次后作废', async () => {
    const farmerLogin = await api('POST', '/auth/login', {
      username: 'security-farmer',
      password: 'old-password',
    })
    farmerSession = farmerLogin.payload.data
    const adminLogin = await api('POST', '/auth/login', {
      username: 'security-admin',
      password: 'old-password',
    })
    adminSession = adminLogin.payload.data

    const forbidden = await api('POST', '/admin/security/password-reset-code', {
      username: 'security-farmer',
    }, farmerSession.token)
    assert.equal(forbidden.status, 403)

    const generated = await api('POST', '/admin/security/password-reset-code', {
      username: 'security-farmer',
    }, adminSession.token)
    assert.equal(generated.status, 200)
    assert.match(generated.payload.data.resetCode, /^\d{6}$/)

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const failed = await api('POST', '/auth/reset-password', {
        username: 'security-farmer',
        resetCode: '999999',
        newPassword: 'new-password',
      })
      assert.equal(failed.status, 400)
    }
    const exhausted = await api('POST', '/auth/reset-password', {
      username: 'security-farmer',
      resetCode: generated.payload.data.resetCode,
      newPassword: 'new-password',
    })
    assert.equal(exhausted.status, 400)
  })

  await t.test('过期码失败；新码只能使用一次并撤销旧会话', async () => {
    const expired = await api('POST', '/admin/security/password-reset-code', {
      username: 'security-farmer',
    }, adminSession.token)
    assert.equal(expired.status, 200)
    await prisma.passwordResetCode.updateMany({
      where: { usedAt: null },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    })
    assert.equal((await api('POST', '/auth/reset-password', {
      username: 'security-farmer',
      resetCode: expired.payload.data.resetCode,
      newPassword: 'new-password',
    })).status, 400)

    const generated = await api('POST', '/admin/security/password-reset-code', {
      username: 'security-farmer',
    }, adminSession.token)
    const resetBody = {
      username: 'security-farmer',
      resetCode: generated.payload.data.resetCode,
      newPassword: 'new-password',
    }
    assert.equal((await api('POST', '/auth/reset-password', resetBody)).status, 200)
    assert.equal((await api('POST', '/auth/reset-password', resetBody)).status, 400)
    assert.equal((await api('GET', '/user/profile', null, farmerSession.token)).status, 401)
    assert.equal((await api('POST', '/auth/login', {
      username: 'security-farmer',
      password: 'old-password',
    })).status, 400)

    const newLogin = await api('POST', '/auth/login', {
      username: 'security-farmer',
      password: 'new-password',
    })
    assert.equal(newLogin.status, 200)
    farmerSession = newLogin.payload.data
  })

  await t.test('ADMIN 可强制撤销指定账号全部设备会话', async () => {
    const revoked = await api('POST', '/admin/security/revoke-sessions', {
      username: 'security-farmer',
    }, adminSession.token)
    assert.equal(revoked.status, 200)
    assert.ok(revoked.payload.data.revokedCount >= 1)
    assert.equal((await api('GET', '/user/profile', null, farmerSession.token)).status, 401)
  })
})
