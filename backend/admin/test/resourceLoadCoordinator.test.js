// 116g-B 配置/列表加载协调器（真实时序强测试，页面与测试共用同一实现）
// 整改 #1：配置/列表独立序号；配置在途时搜索/刷新不触发无配置请求；
//         配置必能完成或被确定性重发；绝不永久停留在 config-loading；资源切换旧响应全部失效。
// 整改 #2：lastQuery 意图口径；删除后按最新查询参数恰好刷新一次。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createResourceLoadCoordinator, LOAD_RESULT } from '../src/policies/resourceLoadCoordinator.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function okList(records = []) {
  return { records, total: records.length, pageNum: 1, pageSize: 10 };
}

describe('createResourceLoadCoordinator — 配置/列表独立序号（整改 #1）', () => {
  it('配置在途 + 搜索/刷新：列表请求被忽略（不发无配置请求），配置仍完成，绝不停留 config-loading', async () => {
    const configGate = deferred();
    const listCalls = [];
    const coord = createResourceLoadCoordinator({
      fetchConfig: () => configGate.promise,
      fetchList: (...args) => {
        listCalls.push(args);
        return Promise.resolve(okList());
      },
      applyConfig: () => {},
      applyList: () => {},
      applyError: () => {},
      onLoadingChange: () => {},
    });

    const started = coord.startResource();
    await Promise.resolve(); // 让配置请求发出并进入在途

    // 配置在途期间用户触发搜索/刷新 → 必须被忽略，不得发出无配置请求
    const r1 = await coord.loadList(1, 10, '玉米');
    const r2 = await coord.loadList(2, 20, '水稻');
    assert.equal(r1, LOAD_RESULT.IGNORED_NO_CONFIG, 'search during config in-flight must be ignored');
    assert.equal(r2, LOAD_RESULT.IGNORED_NO_CONFIG, 'refresh during config in-flight must be ignored');
    assert.equal(listCalls.length, 0, 'no list request without config');

    // 配置完成 → 配置仍能落地，并自动加载第 1 页
    configGate.resolve({ fields: [{ name: 'title' }] });
    const result = await started;
    assert.equal(result, LOAD_RESULT.APPLIED);
    assert.equal(listCalls.length, 1, 'auto list load after config applied');
    assert.deepEqual(listCalls[0], [1, 10, '']);
    const state = coord.getState();
    assert.equal(state.configLoading, false, 'must never stay in config-loading');
    assert.equal(state.listLoading, false);
  });

  it('配置在途 + retry：配置被确定性重发，旧响应丢弃，最终落地新配置且不永久加载', async () => {
    const d1 = deferred();
    const d2 = deferred();
    const configData = [];
    const applied = [];
    let configCall = 0;
    const coord = createResourceLoadCoordinator({
      fetchConfig: () => {
        configCall += 1;
        return configCall === 1 ? d1.promise : d2.promise;
      },
      fetchList: () => Promise.resolve(okList()),
      applyConfig: (data) => applied.push(data),
      applyList: () => {},
      applyError: () => {},
      onLoadingChange: () => {},
    });

    const first = coord.startResource();
    await Promise.resolve();
    assert.equal(configCall, 1);

    // 用户重试：配置被确定性重发（第二次请求）
    const retried = coord.retry();
    await Promise.resolve();
    assert.equal(configCall, 2, 'retry must deterministically re-send config');

    // 旧配置晚到 → 丢弃（STALE），不落地
    d1.resolve({ fields: [{ name: 'old' }] });
    const r1 = await first;
    assert.equal(r1, LOAD_RESULT.STALE, 'stale config result must be discarded');
    assert.equal(applied.length, 0, 'stale config must never be applied');

    // 新配置落地 → APPLIED，且最终加载态收敛
    d2.resolve({ fields: [{ name: 'title' }] });
    const r2 = await retried;
    assert.equal(r2, LOAD_RESULT.APPLIED);
    assert.equal(applied.length, 1);
    assert.deepEqual(applied[0], { fields: [{ name: 'title' }] });
    assert.equal(coord.getState().configLoading, false);
    assert.equal(coord.getState().listLoading, false);
  });

  it('资源切换：旧配置与旧列表在途响应全部失效（STALE），仅新资源列表落地', async () => {
    const listGates = { A: deferred(), B: deferred() };
    const applied = [];
    const listCalls = [];
    let resource = 'A';

    const coord = createResourceLoadCoordinator({
      fetchConfig: async () => ({ fields: [{ name: resource }] }),
      fetchList: (page, pageSize, keyword) => {
        listCalls.push({ resource, page, pageSize, keyword });
        return resource === 'A' ? listGates.A.promise : listGates.B.promise;
      },
      applyConfig: (data) => applied.push({ kind: 'config', name: data.fields[0].name }),
      applyList: (data) => applied.push({ kind: 'list', ids: data.records.map((r) => r.id) }),
      applyError: () => {},
      onLoadingChange: () => {},
    });

    // 资源 A：配置立即落地，列表进入在途
    const aStart = coord.startResource();
    await new Promise((resolve) => setTimeout(resolve, 0)); // 冲刷微任务：A 配置落地并已发出列表请求
    assert.deepEqual(
      { resource: listCalls[0].resource, page: listCalls[0].page },
      { resource: 'A', page: 1 },
    );

    // 切换到资源 B：B 配置落地、B 列表完成
    resource = 'B';
    const bStart = coord.startResource();
    await new Promise((resolve) => setTimeout(resolve, 0));
    listGates.B.resolve(okList([{ id: 2 }]));
    const bResult = await bStart;
    assert.equal(bResult, LOAD_RESULT.APPLIED);

    // A 的旧列表晚到 → 必须被丢弃，不得覆盖 B
    listGates.A.resolve(okList([{ id: 1 }]));
    const aResult = await aStart;
    assert.equal(aResult, LOAD_RESULT.STALE, 'A stale list must be discarded after switch');

    // 落地序列：A 配置、B 配置、B 列表；A 列表从未落地
    assert.deepEqual(applied, [
      { kind: 'config', name: 'A' },
      { kind: 'config', name: 'B' },
      { kind: 'list', ids: [2] },
    ]);
    assert.deepEqual(coord.getLastQuery(), { page: 1, pageSize: 10, keyword: '' });
  });

  it('列表竞态：旧响应晚到不得覆盖新状态，lastQuery 保持最新', async () => {
    const g1 = deferred();
    const applied = [];
    const coord = createResourceLoadCoordinator({
      fetchConfig: async () => ({ fields: [] }),
      fetchList: (page) => (page === 2 ? g1.promise : Promise.resolve(okList([{ id: 3 }]))),
      applyConfig: () => {},
      applyList: (data, query) => applied.push({ ids: data.records.map((r) => r.id), query }),
      applyError: () => {},
      onLoadingChange: () => {},
    });

    await coord.startResource(); // 应用第 1 页
    const p1 = coord.loadList(2, 20, '玉米'); // 旧请求（晚回）
    const p2 = coord.loadList(3, 20, '水稻'); // 新请求（先回）
    const r2 = await p2;
    assert.equal(r2, LOAD_RESULT.APPLIED);

    g1.resolve(okList([{ id: 2 }]));
    const r1 = await p1;
    assert.equal(r1, LOAD_RESULT.STALE, 'stale list response must be discarded');
    assert.equal(applied.length, 2, 'only startResource + newer search applied');
    assert.deepEqual(coord.getLastQuery(), { page: 3, pageSize: 20, keyword: '水稻' });
  });
});

describe('createResourceLoadCoordinator — 删除/写后刷新参数（整改 #2）', () => {
  it('先搜索/换页，再删除刷新：refreshCurrentQuery 恰好一次且参数为最新查询', async () => {
    const listCalls = [];
    const coord = createResourceLoadCoordinator({
      fetchConfig: async () => ({ fields: [] }),
      fetchList: (page, pageSize, keyword) => {
        listCalls.push({ page, pageSize, keyword });
        return Promise.resolve(okList());
      },
      applyConfig: () => {},
      applyList: () => {},
      applyError: () => {},
      onLoadingChange: () => {},
    });

    await coord.startResource();
    await coord.loadList(2, 20, '玉米');
    const before = listCalls.length;

    // 删除成功后的刷新（页面 deleteOp.onSuccess 中真实调用的同一函数）
    const result = await coord.refreshCurrentQuery();
    assert.equal(result, LOAD_RESULT.APPLIED);
    assert.equal(listCalls.length, before + 1, 'delete refresh must fire exactly once');
    assert.deepEqual(listCalls[listCalls.length - 1], { page: 2, pageSize: 20, keyword: '玉米' });
  });

  it('refreshAfterWrite：创建回第 1 页（保留最新 pageSize/keyword），更新留最新查询', async () => {
    const listCalls = [];
    const coord = createResourceLoadCoordinator({
      fetchConfig: async () => ({ fields: [] }),
      fetchList: (page, pageSize, keyword) => {
        listCalls.push({ page, pageSize, keyword });
        return Promise.resolve(okList());
      },
      applyConfig: () => {},
      applyList: () => {},
      applyError: () => {},
      onLoadingChange: () => {},
    });

    await coord.startResource();
    await coord.loadList(2, 20, '玉米');

    await coord.refreshAfterWrite({ mode: 'create' });
    assert.deepEqual(listCalls[listCalls.length - 1], { page: 1, pageSize: 20, keyword: '玉米' }, 'create refresh goes to page 1 with latest pageSize/keyword');

    // 模拟用户翻页后编辑保存：更新应留在当前最新查询页
    await coord.loadList(2, 20, '玉米');
    await coord.refreshAfterWrite({ mode: 'edit' });
    assert.deepEqual(listCalls[listCalls.length - 1], { page: 2, pageSize: 20, keyword: '玉米' }, 'edit refresh stays on latest query');
  });

  it('列表失败：lastQuery 记录失败意图，retry 精确重放失败参数', async () => {
    const listCalls = [];
    let failNext = false;
    const errors = [];
    const coord = createResourceLoadCoordinator({
      fetchConfig: async () => ({ fields: [] }),
      fetchList: (page, pageSize, keyword) => {
        listCalls.push({ page, pageSize, keyword });
        if (failNext) {
          failNext = false;
          return Promise.reject(new Error('50001 服务器内部错误'));
        }
        return Promise.resolve(okList());
      },
      applyConfig: () => {},
      applyList: () => {},
      applyError: (error) => errors.push(error),
      onLoadingChange: () => {},
    });

    await coord.startResource();
    failNext = true;
    const failed = await coord.loadList(3, 15, '水稻');
    assert.equal(failed, LOAD_RESULT.FAILED);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].message, '50001 服务器内部错误');

    const retried = await coord.retry();
    assert.equal(retried, LOAD_RESULT.APPLIED);
    assert.deepEqual(listCalls[listCalls.length - 1], { page: 3, pageSize: 15, keyword: '水稻' }, 'retry must replay the exact failed query');
  });

  it('配置失败：hasConfig=false、列表被忽略、retry 确定性重发配置', async () => {
    let configCalls = 0;
    let failConfig = true;
    const errors = [];
    const coord = createResourceLoadCoordinator({
      fetchConfig: async () => {
        configCalls += 1;
        if (failConfig) throw new Error('40301 权限不足');
        return { fields: [] };
      },
      fetchList: () => Promise.resolve(okList()),
      applyConfig: () => {},
      applyList: () => {},
      applyError: (error) => errors.push(error),
      onLoadingChange: () => {},
    });

    const first = await coord.startResource();
    assert.equal(first, LOAD_RESULT.FAILED);
    assert.equal(errors.length, 1);
    assert.equal(coord.hasConfig(), false);
    assert.equal(await coord.loadList(1, 10, ''), LOAD_RESULT.IGNORED_NO_CONFIG);

    failConfig = false;
    const retried = await coord.retry();
    assert.equal(retried, LOAD_RESULT.APPLIED);
    assert.equal(configCalls, 2, 'retry deterministically re-sends config');
    assert.equal(coord.hasConfig(), true);
    assert.equal(coord.getState().configLoading, false);
  });

  it('getLastQuery 返回快照：外部修改不影响内部状态', async () => {
    const coord = createResourceLoadCoordinator({
      fetchConfig: async () => ({ fields: [] }),
      fetchList: () => Promise.resolve(okList()),
      applyConfig: () => {},
      applyList: () => {},
      applyError: () => {},
      onLoadingChange: () => {},
    });
    await coord.startResource();
    const snapshot = coord.getLastQuery();
    snapshot.page = 99;
    assert.deepEqual(coord.getLastQuery(), { page: 1, pageSize: 10, keyword: '' });
  });
});
