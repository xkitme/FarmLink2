import assert from 'node:assert/strict'
import test from 'node:test'
import jwt from 'jsonwebtoken'
import {
  config,
  resolveSeedPassword,
  validateSecurityConfig,
  resolveRuntimeEnvironment,
} from '../src/config/index.js'
import { signToken, signRefreshToken, verifyAuthToken } from '../src/middleware/auth.js'
import { buildPublicRegistrationData } from '../src/modules/platform/auth.policy.js'

test('公开注册永远只能产生 FARMER 且不接受区域字段', () => {
  const data = buildPublicRegistrationData({
    username: '  farmer-01  ',
    password: 'ignored',
    displayName: '张三',
    phone: '13800138000',
    role: 'ADMIN',
    regionCode: 'ADMIN-ALL',
    villageName: '全域',
    status: 0,
  }, 'hash')

  assert.deepEqual(data, {
    username: 'farmer-01',
    passwordHash: 'hash',
    nickname: '张三',
    phone: '13800138000',
    role: 'FARMER',
    regionCode: null,
    villageName: null,
  })
})

test('运行环境未显式指定时只把 production 视为 release', () => {
  assert.equal(resolveRuntimeEnvironment({ NODE_ENV: 'production' }), 'release')
  assert.equal(resolveRuntimeEnvironment({ NODE_ENV: 'development' }), 'dev')
  assert.equal(resolveRuntimeEnvironment({ APP_ENV: 'demo', NODE_ENV: 'production' }), 'demo')
})

test('demo/release 必须使用两个不同的强密钥', () => {
  const valid = {
    runtime: { environment: 'release' },
    jwt: { secret: 'a'.repeat(32), refreshSecret: 'b'.repeat(32) },
  }
  assert.doesNotThrow(() => validateSecurityConfig(valid))
  assert.throws(() => validateSecurityConfig({
    ...valid,
    jwt: { secret: 'village-dev-secret', refreshSecret: 'b'.repeat(32) },
  }), /安全配置校验失败/)
  assert.throws(() => validateSecurityConfig({
    ...valid,
    jwt: { secret: 'a'.repeat(32), refreshSecret: 'a'.repeat(32) },
  }), /必须不同/)
})

test('种子账号只允许 dev 回退或 demo 显式密码，release 始终拒绝', () => {
  const strongJwt = { secret: 'a'.repeat(32), refreshSecret: 'b'.repeat(32) }
  assert.equal(resolveSeedPassword({
    runtime: { environment: 'dev' },
    jwt: strongJwt,
  }, {}), '123456')
  assert.equal(resolveSeedPassword({
    runtime: { environment: 'demo' },
    jwt: strongJwt,
  }, { SEED_PASSWORD: 'demo-strong-password' }), 'demo-strong-password')
  assert.throws(() => resolveSeedPassword({
    runtime: { environment: 'demo' },
    jwt: strongJwt,
  }, {}), /SEED_PASSWORD/)
  assert.throws(() => resolveSeedPassword({
    runtime: { environment: 'release' },
    jwt: strongJwt,
  }, { SEED_PASSWORD: 'release-password' }), /禁止执行种子脚本/)
})

test('access/refresh token 使用不同密钥并带有明确类型', async () => {
  const payload = { id: 1, username: 'farmer-01', role: 'FARMER' }
  const access = signToken(payload)
  const refresh = signRefreshToken(payload)
  const accessClaims = jwt.verify(access, config.jwt.secret)
  const refreshClaims = jwt.verify(refresh, config.jwt.refreshSecret)

  assert.equal(accessClaims.tokenType, 'access')
  assert.equal(refreshClaims.tokenType, 'refresh')
  assert.throws(() => jwt.verify(refresh, config.jwt.secret))
  assert.throws(() => jwt.verify(access, config.jwt.refreshSecret))
  await assert.rejects(() => verifyAuthToken(refresh), { code: 40101 })
  await assert.rejects(() => verifyAuthToken(access, 'refresh'), { code: 40101 })
})
