// B19 & B20 — Admin apiCatalog.js & resourceGroups.js contract tests（116f-E 更新版）
// Node built-in test runner; pure functions, no browser mocks needed.
//
// B19（116f-E）：apiCatalog.js 为注册表生成产物——
//   唯一事实源 = ../../src/contracts/capabilities.js；
//   key=apiId、method/path/auth/roles 与注册表一致；覆盖完整；重复=0；
//   可确定性重建（buildCatalog() 与提交产物逐字段一致）；26 条 v1 调试预设保留。
// B20（116f-E，D2）：resourceGroups 去重——
//   aiDetectRecord 唯一 primaryGroup=agri，ai 组仅以 tags 表达次级归属；
//   admin 与 backend 两份资源组镜像一致；重复=0；代表性归属不变。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { API_CATALOG, flatApiCatalog } from '../src/apiCatalog.js';
import { RESOURCE_GROUPS as ADMIN_RESOURCE_GROUPS } from '../src/resourceGroups.js';
import { CAPABILITY_REGISTRY } from '../../src/contracts/capabilities.js';
import { RESOURCE_GROUPS as BACKEND_RESOURCE_GROUPS } from '../../src/modules/platform/resource.config.js';
import { buildCatalog } from '../../scripts/gen-admin-api-catalog.mjs';

/** 参数段（:xxx）与纯数字段统一为 :p、忽略 query（与生成器同口径，独立实现）。 */
function normalizePath(routePath) {
  const bare = routePath.split('?')[0];
  return `/${bare.split('/').filter(Boolean).map((seg) => (/^\d+$/.test(seg) || seg.startsWith(':') ? ':p' : seg)).join('/')}`;
}

const registryV1 = CAPABILITY_REGISTRY.capabilities
  .flatMap((cap) => cap.apis.filter((api) => api.version === 'v1').map((api) => ({ cap, api })));
const registryV1ByApiId = new Map(registryV1.map(({ api }) => [api.apiId, api]));
const flat = flatApiCatalog();

// 116f-E 起保留的 26 条 v1 调试预设（名称清单，防预设被吞并或丢失）
const PRESET_NAMES = [
  '运营驾驶舱', 'AI 状态', 'AI 模型配置', '全局搜索', '消息通知列表', '消息未读数',
  '地块列表', '新增农事记录', '产量预测', '行情查询', '商品列表', '包装文案生成',
  '政策列表', '政策 AI 问答', '通用 AI 对话', 'AI 对话列表', 'AI 单个会话',
  '删除单条 AI 记录', '删除 AI 会话', '天气预警列表', '数据同步', '同步状态',
  'API 开关列表', '操作日志列表', '限流快照', '初始化数据概览',
];

describe('B19: apiCatalog.js — 注册表生成目录（key 唯一 / 覆盖完整 / 可重建 / 预设保留）', () => {
  it('flatApiCatalog 非空，且条目数精确等于注册表 v1 API 数（覆盖完整）', () => {
    assert.ok(Array.isArray(flat) && flat.length > 0, 'flatApiCatalog should be a non-empty array');
    assert.equal(flat.length, registryV1.length,
      `catalog ${flat.length} != registry v1 ${registryV1.length}`);
  });

  it('每条目含 key/name/method/path/auth 与 roles（auth 为 boolean）', () => {
    for (const item of flat) {
      assert.ok(typeof item.key === 'string' && item.key.length > 0, `item missing key: ${JSON.stringify(item)}`);
      assert.ok(typeof item.name === 'string', `item ${item.key} missing name`);
      assert.ok(typeof item.method === 'string', `item ${item.key} missing method`);
      assert.ok(typeof item.path === 'string', `item ${item.key} missing path`);
      assert.ok(typeof item.auth === 'boolean', `item ${item.key} auth not boolean`);
      assert.ok(item.roles === null || (Array.isArray(item.roles) && item.roles.every((r) => typeof r === 'string')),
        `item ${item.key} roles invalid`);
    }
  });

  it('key 全局唯一（0 重复）', () => {
    const keys = flat.map((item) => item.key);
    assert.equal(new Set(keys).size, keys.length, 'duplicate keys found');
  });

  it('method+规范化 path 全局唯一（0 重复，防同名吞并）', () => {
    const sigs = flat.map((item) => `${item.method} ${normalizePath(item.path)}`);
    const dups = [...new Set(sigs.filter((sig, i) => sigs.indexOf(sig) !== i))];
    assert.equal(dups.length, 0, `duplicate method+path entries: ${dups.join(', ')}`);
  });

  it('生成产物与注册表可确定性重建一致（buildCatalog === 提交产物）', () => {
    assert.deepEqual(buildCatalog(), API_CATALOG);
  });

  it('每条目与注册表逐字段一致：apiId=key、method、规范化 path、auth 映射、roles', () => {
    for (const item of flat) {
      const api = registryV1ByApiId.get(item.key);
      assert.ok(api, `catalog key ${item.key} not found in registry`);
      assert.equal(item.method, api.method, `${item.key} method mismatch`);
      assert.equal(normalizePath(item.path), normalizePath(api.path), `${item.key} path mismatch`);
      assert.equal(item.auth, api.auth === 'required', `${item.key} auth mapping mismatch`);
      assert.deepEqual(item.roles ?? null, api.roles ?? null, `${item.key} roles mismatch`);
    }
  });

  it('注册表每条 v1 API 恰好对应一条目录条目（双向覆盖）', () => {
    const keys = new Set(flat.map((item) => item.key));
    for (const apiId of registryV1ByApiId.keys()) {
      assert.ok(keys.has(apiId), `registry apiId ${apiId} missing from catalog`);
    }
  });

  it('26 条 v1 调试预设全部保留（名称逐条在场）', () => {
    const names = new Set(flat.map((item) => item.name));
    for (const name of PRESET_NAMES) {
      assert.ok(names.has(name), `preset ${name} missing from generated catalog`);
    }
  });

  it('"dashboard" 预设：GET /data/dashboard、auth=true、装饰保留', () => {
    const api = registryV1.find(({ api }) => api.method === 'GET' && api.path === '/data/dashboard').api;
    const item = flat.find((e) => e.key === api.apiId);
    assert.ok(item, 'dashboard entry must exist');
    assert.equal(item.method, 'GET');
    assert.equal(item.path, '/data/dashboard');
    assert.equal(item.auth, true);
    assert.equal(item.name, '运营驾驶舱');
    assert.equal(item.bodyNote, '无需请求体。');
    assert.equal(item.description, '读取首页统计卡片、作物面积分布和服务状态。');
  });

  it('"market-products" 预设：示例 query 路径保留、auth=false（与注册表 optional 一致）', () => {
    const api = registryV1.find(({ api }) => api.method === 'GET' && api.path === '/market/product/list').api;
    const item = flat.find((e) => e.key === api.apiId);
    assert.ok(item, 'market-products entry must exist');
    assert.equal(item.path, '/market/product/list?pageNum=1&pageSize=10');
    assert.equal(item.auth, false);
    assert.equal(item.name, '商品列表');
  });

  it('"farm-record-create" 预设：请求体保留（recordType=施肥）', () => {
    const api = registryV1.find(({ api }) => api.method === 'POST' && api.path === '/agri/record').api;
    const item = flat.find((e) => e.key === api.apiId);
    assert.ok(item, 'farm-record-create entry must exist');
    assert.deepEqual(item.body, {
      userId: 1,
      plotId: 1,
      recordType: '施肥',
      cropType: '玉米',
      content: '追施复合肥 20 公斤，土壤墒情良好',
      cost: 86,
      recordDate: '2026-05-21',
      localUuid: 'farm-record-001',
    });
  });

  it('"ai-qa-thread" 预设：示例 /ai/qa/threads/1 对齐注册表 /ai/qa/threads/:threadId', () => {
    const api = registryV1.find(({ api }) => api.method === 'GET' && api.path === '/ai/qa/threads/:threadId').api;
    const item = flat.find((e) => e.key === api.apiId);
    assert.ok(item, 'ai-qa-thread entry must exist');
    assert.equal(item.path, '/ai/qa/threads/1');
    assert.equal(item.auth, true);
    assert.equal(item.name, 'AI 单个会话');
  });

  it('"switch-list" 预设：/admin/api-switch/list 示例 query、auth=true、roles=[ADMIN]（注册表同源）', () => {
    const api = registryV1.find(({ api }) => api.method === 'GET' && api.path === '/admin/api-switch/list').api;
    const item = flat.find((e) => e.key === api.apiId);
    assert.ok(item, 'switch-list entry must exist');
    assert.equal(item.path, '/admin/api-switch/list?pageNum=1&pageSize=10');
    assert.equal(item.auth, true);
    assert.deepEqual(item.roles, ['ADMIN']);
    assert.equal(item.name, 'API 开关列表');
  });
});

describe('B20: resourceGroups — aiDetectRecord 去重（D2）+ admin/backend 镜像一致', () => {
  const adminAll = Object.values(ADMIN_RESOURCE_GROUPS).flatMap((g) => g.resources);
  const backendAll = BACKEND_RESOURCE_GROUPS.flatMap((g) => g.resources);

  it('admin：跨组资源全局唯一（0 重复）', () => {
    assert.equal(new Set(adminAll).size, adminAll.length, 'duplicate resources in admin groups');
  });

  it('admin：aiDetectRecord 唯一 primaryGroup=agri，ai 组仅以 tags 表达', () => {
    assert.ok(ADMIN_RESOURCE_GROUPS.agri.resources.includes('aiDetectRecord'),
      'aiDetectRecord must stay in agri (primaryGroup)');
    assert.deepEqual(ADMIN_RESOURCE_GROUPS.ai.resources, ['aiQaRecord'],
      'ai group resources must be exactly [aiQaRecord]');
    assert.deepEqual(ADMIN_RESOURCE_GROUPS.ai.tags, ['aiDetectRecord'],
      'ai group tags must express aiDetectRecord as secondary');
  });

  it('admin：去重后共 35 个资源（9 组，唯一且总数一致）', () => {
    assert.equal(adminAll.length, 35);
    assert.equal(new Set(adminAll).size, 35);
  });

  it('backend：跨组资源全局唯一（0 重复）', () => {
    assert.equal(new Set(backendAll).size, backendAll.length, 'duplicate resources in backend groups');
  });

  it('backend：aiDetectRecord 唯一 primaryGroup=agri，ai 组仅以 tags 表达', () => {
    const agri = BACKEND_RESOURCE_GROUPS.find((g) => g.key === 'agri');
    const ai = BACKEND_RESOURCE_GROUPS.find((g) => g.key === 'ai');
    assert.ok(agri.resources.includes('aiDetectRecord'), 'aiDetectRecord must stay in backend agri');
    assert.deepEqual(ai.resources, ['aiQaRecord'], 'backend ai group resources must be exactly [aiQaRecord]');
    assert.deepEqual(ai.tags, ['aiDetectRecord'], 'backend ai group tags must express aiDetectRecord');
  });

  it('backend：去重后共 35 个资源（唯一且总数一致）', () => {
    assert.equal(backendAll.length, 35);
    assert.equal(new Set(backendAll).size, 35);
  });

  it('代表性归属不变：order∈market、aiQaRecord∈ai、statReport∈data（admin）', () => {
    assert.ok(ADMIN_RESOURCE_GROUPS.market.resources.includes('order'), 'order should be in market group');
    assert.ok(ADMIN_RESOURCE_GROUPS.ai.resources.includes('aiQaRecord'), 'aiQaRecord should be in ai group');
    assert.ok(ADMIN_RESOURCE_GROUPS.data.resources.includes('statReport'), 'statReport should be in data group');
  });

  it('代表性归属不变：landPlot/farmRecord/yieldPrediction∈agri（backend，防错误吞并）', () => {
    const agri = BACKEND_RESOURCE_GROUPS.find((g) => g.key === 'agri');
    for (const key of ['landPlot', 'farmRecord', 'aiDetectRecord', 'yieldPrediction']) {
      assert.ok(agri.resources.includes(key), `${key} must remain in backend agri group`);
    }
  });

  it('admin 与 backend 两份资源组镜像一致（组→资源集合与 tags 均一致）', () => {
    const keyMap = {
      users: 'platform',
      agri: 'agri',
      market: 'market',
      machinery: 'machinery',
      disaster: 'disaster',
      policy: 'policy',
      life: 'life',
      data: 'data',
      ai: 'ai',
    };
    for (const [adminKey, backendKey] of Object.entries(keyMap)) {
      const adminGroup = ADMIN_RESOURCE_GROUPS[adminKey];
      const backendGroup = BACKEND_RESOURCE_GROUPS.find((g) => g.key === backendKey);
      assert.ok(adminGroup && backendGroup, `group pair ${adminKey}<->${backendKey} missing`);
      assert.deepEqual([...adminGroup.resources].sort(), [...backendGroup.resources].sort(),
        `resource sets differ for ${adminKey}<->${backendKey}`);
      assert.deepEqual(adminGroup.tags || [], backendGroup.tags || [],
        `tags differ for ${adminKey}<->${backendKey}`);
    }
  });

  it('every group has title and resources array (admin + backend)', () => {
    for (const [key, group] of Object.entries(ADMIN_RESOURCE_GROUPS)) {
      assert.ok(typeof group.title === 'string', `admin group ${key} missing title`);
      assert.ok(Array.isArray(group.resources), `admin group ${key} resources is not an array`);
    }
    for (const group of BACKEND_RESOURCE_GROUPS) {
      assert.ok(typeof group.title === 'string', `backend group ${group.key} missing title`);
      assert.ok(Array.isArray(group.resources), `backend group ${group.key} resources is not an array`);
    }
  });
});
