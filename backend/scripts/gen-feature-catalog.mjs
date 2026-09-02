/**
 * 116f-F Flutter 功能墙生成器（构建期脚本，离线安全，输出确定）。
 *
 * 数据源：backend/src/contracts/capabilities.js 的 featureCatalog 区块（gen-capabilities.mjs
 * 的生成产物）。人工可编辑事实源 = gen-capabilities.mjs 的 FEATURE_CATALOG overlay
 * （sections/routes/routeFeatures/features），改后必须 `--write` 重建 capabilities.js。
 * - kFeatureSections 由 featureCatalog.sections 生成；
 * - kFeatureCatalog 由 featureCatalog.features 生成（id/tier/journey/name/keywords/route/icon/section 逐字段一致）。
 * icon 存 Material 图标常量名（如 biotech_outlined），渲染为 Icons.biotech_outlined；
 * 生成产物不依赖 Node/运行时网络，是可直接被 flutter analyze/test/build 消费的合法 Dart。
 *
 * 输出：app/lib/core/feature_catalog.dart（提交进版本库的生成产物，D5）。
 *
 * 用法（cwd = backend/）：
 *   node scripts/gen-feature-catalog.mjs --write   重新生成
 *   node scripts/gen-feature-catalog.mjs --check   校验生成产物与注册表一致（漂移门禁）
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CAPABILITY_REGISTRY } from '../src/contracts/capabilities.js'

const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_FILE = path.join(BACKEND_ROOT, '..', 'app', 'lib', 'core', 'feature_catalog.dart')

/** Dart 单引号字符串字面量转义（确定性：\ → \\、' → \'、$ → \$）。 */
function dartString(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\$/g, '\\$')
}

function renderKeywords(keywords) {
  return `[${keywords.map((k) => `'${dartString(k)}'`).join(', ')}]`
}

/** 从注册表 featureCatalog 派生功能墙数据（纯函数、确定性，顺序=注册表顺序）。 */
export function buildFeatureCatalog(registry = CAPABILITY_REGISTRY) {
  const fc = registry.featureCatalog
  if (!fc || typeof fc.sections !== 'object' || !Array.isArray(fc.features)) {
    throw new Error('注册表缺少 featureCatalog 区块（sections/features），无法生成 Flutter 功能墙')
  }
  return {
    sections: Object.entries(fc.sections),
    features: fc.features.map((f) => ({
      id: String(f.id),
      tier: String(f.tier),
      journey: f.journey == null ? null : String(f.journey),
      name: String(f.name),
      keywords: f.keywords.map(String),
      route: String(f.route),
      icon: String(f.icon),
      section: String(f.section),
    })),
  }
}

function render(catalog) {
  const lines = [
    '// 本文件由 backend/scripts/gen-feature-catalog.mjs 自动生成，请勿手工编辑。',
    '// 重新生成：cd backend && node scripts/gen-feature-catalog.mjs --write',
    '// 漂移检查：cd backend && node scripts/gen-feature-catalog.mjs --check',
    '//',
    '// 116f-F Flutter 功能墙（数据源 = backend/src/contracts/capabilities.js featureCatalog，gen-capabilities.mjs 生成产物；',
    '// 驱动全局搜索（search_page）与全部服务（all_features_page）；tier/journey 用于 6 条主路径收敛）。',
    "import 'package:flutter/material.dart';",
    '',
    'enum FeatureTier { primary, tool, experimental }',
    '',
    'class FeatureItem {',
    '  final String id;',
    '  final FeatureTier tier;',
    '  final String? journey;',
    '  final String name;',
    '  final List<String> keywords;',
    '  final String route;',
    '  final IconData icon;',
    '  final String section;',
    '',
    '  const FeatureItem({',
    '    required this.id,',
    '    required this.tier,',
    '    this.journey,',
    '    required this.name,',
    '    required this.keywords,',
    '    required this.route,',
    '    required this.icon,',
    '    required this.section,',
    '  });',
    '}',
    '',
    'const kFeatureSections = <String, String>{',
    ...catalog.sections.map(([key, title]) => `  '${dartString(key)}': '${dartString(title)}',`),
    '};',
    '',
    'const kFeatureCatalog = <FeatureItem>[',
  ]
  for (const f of catalog.features) {
    lines.push('  FeatureItem(')
    lines.push(`      id: '${dartString(f.id)}',`)
    lines.push(`      tier: FeatureTier.${f.tier},`)
    if (f.journey !== null) {
      lines.push(`      journey: '${dartString(f.journey)}',`)
    }
    lines.push(`      name: '${dartString(f.name)}',`)
    lines.push(`      keywords: ${renderKeywords(f.keywords)},`)
    lines.push(`      route: '${dartString(f.route)}',`)
    lines.push(`      icon: Icons.${f.icon},`)
    lines.push(`      section: '${dartString(f.section)}'),`)
  }
  lines.push(
    '];',
    '',
    'final kPrimaryFeatures = kFeatureCatalog',
    '    .where((f) => f.tier == FeatureTier.primary)',
    '    .toList(growable: false);',
    '',
    'final kToolFeatures = kFeatureCatalog',
    '    .where((f) => f.tier == FeatureTier.tool)',
    '    .toList(growable: false);',
    '',
    'final kExperimentalFeatures = kFeatureCatalog',
    '    .where((f) => f.tier == FeatureTier.experimental)',
    '    .toList(growable: false);',
    '',
  )
  return lines.join('\n')
}

/** 漂移检查（只读）：返回 { ok, rendered }，绝不改写文件。 */
export function checkFeatureCatalog(fileContent, registry = CAPABILITY_REGISTRY) {
  const rendered = render(buildFeatureCatalog(registry))
  return { ok: fileContent === rendered, rendered }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
const mode = process.argv[2]

if (isMain && mode === '--write') {
  const catalog = buildFeatureCatalog()
  fs.writeFileSync(OUT_FILE, render(catalog), 'utf8')
  console.log(`✓ 已生成 ${path.relative(BACKEND_ROOT, OUT_FILE)}：${catalog.sections.length} 个 section / ${catalog.features.length} 个功能点`)
} else if (isMain && mode === '--check') {
  const catalog = buildFeatureCatalog()
  const rendered = render(catalog)
  const current = fs.readFileSync(OUT_FILE, 'utf8')
  if (current !== rendered) {
    console.error(`✗ ${path.relative(BACKEND_ROOT, OUT_FILE)} 与注册表漂移。请运行：node scripts/gen-feature-catalog.mjs --write`)
    process.exit(1)
  }
  console.log(`✓ ${path.relative(BACKEND_ROOT, OUT_FILE)} 与注册表一致（${catalog.sections.length} 个 section / ${catalog.features.length} 个功能点）`)
} else if (isMain) {
  console.error('用法：node scripts/gen-feature-catalog.mjs --write | --check')
  process.exit(2)
}
