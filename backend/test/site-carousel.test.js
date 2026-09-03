/**
 * 首页图片轮播配置契约。
 *
 * 只验证站点图响应规则，不启动服务、不连接正式数据库。
 */

import assert from 'node:assert/strict'
import test, { after } from 'node:test'

import { prisma } from '../src/db.js'
import { homeCarouselPayload } from '../src/modules/platform/site.controller.js'

after(async () => {
  await prisma.$disconnect()
})

test('首页轮播图：后端返回三张站点图片并保留 bundled 兜底', () => {
  const slides = homeCarouselPayload()

  assert.equal(slides.length, 3)
  assert.deepEqual(slides.map((slide) => slide.id), [
    'weather-monitoring',
    'smart-farming',
    'farm-market',
  ])

  for (const slide of slides) {
    assert.equal(typeof slide.title, 'string')
    assert.equal(typeof slide.subtitle, 'string')
    assert.match(slide.imageUrl, /^\/uploads\/site\/.+\.(jpg|jpeg|png|webp|gif)$/)
    assert.match(slide.fallbackAsset, /^assets\/images\/generated\/.+\.jpg$/)
    assert.match(slide.targetPath, /^\//)
  }
})
