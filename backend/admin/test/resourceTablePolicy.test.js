// 116g-B ResourceTable 状态解析与竞态判定（纯函数强测试）
// 覆盖工作单强测试 5（旧响应不覆盖新状态）、11（loading/empty/error/unauthorized 不混淆）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  TABLE_STATE,
  isConfigUnavailable,
  isStaleResponse,
  resolveTableState,
} from '../src/policies/resourceTablePolicy.js';

describe('resolveTableState — 确定性状态互不混淆（强测试 11）', () => {
  it('五类状态 key 两两不同', () => {
    const keys = [
      TABLE_STATE.CONFIG_LOADING,
      TABLE_STATE.LIST_LOADING,
      TABLE_STATE.READY,
      TABLE_STATE.EMPTY,
      TABLE_STATE.ERROR,
      TABLE_STATE.UNAUTHORIZED,
      TABLE_STATE.API_DISABLED,
    ];
    assert.equal(new Set(keys).size, keys.length, 'state keys must be distinct');
  });

  it('config 未就绪且加载中 → config-loading', () => {
    assert.equal(
      resolveTableState({ configLoading: true, listLoading: false, error: null, rows: [], config: null }),
      TABLE_STATE.CONFIG_LOADING,
    );
  });

  it('config 就绪且列表加载中 → list-loading（即便旧行仍在）', () => {
    assert.equal(
      resolveTableState({ configLoading: false, listLoading: true, error: null, rows: [{ id: 1 }], config: {} }),
      TABLE_STATE.LIST_LOADING,
    );
  });

  it('config 就绪、无错误、有行 → ready', () => {
    assert.equal(
      resolveTableState({ configLoading: false, listLoading: false, error: null, rows: [{ id: 1 }], config: {} }),
      TABLE_STATE.READY,
    );
  });

  it('config 就绪、无错误、无行且未加载 → empty（与 list-loading 明显不同）', () => {
    assert.equal(
      resolveTableState({ configLoading: false, listLoading: false, error: null, rows: [], config: {} }),
      TABLE_STATE.EMPTY,
    );
    assert.notEqual(TABLE_STATE.EMPTY, TABLE_STATE.LIST_LOADING);
  });

  it('error 分类 forbidden → unauthorized；api-disabled → api-disabled；其它 → error', () => {
    assert.equal(
      resolveTableState({ configLoading: false, listLoading: false, error: { category: 'forbidden' }, rows: [{ id: 1 }], config: {} }),
      TABLE_STATE.UNAUTHORIZED,
    );
    assert.equal(
      resolveTableState({ configLoading: false, listLoading: false, error: { category: 'api-disabled' }, rows: [], config: {} }),
      TABLE_STATE.API_DISABLED,
    );
    assert.equal(
      resolveTableState({ configLoading: false, listLoading: false, error: { category: 'network' }, rows: [{ id: 1 }], config: {} }),
      TABLE_STATE.ERROR,
    );
  });

  it('错误存在时优先于残留行（旧数据不得静默回退成 ready）', () => {
    const state = resolveTableState({
      configLoading: false,
      listLoading: false,
      error: { category: 'server' },
      rows: [{ id: 1 }],
      config: {},
    });
    assert.equal(state, TABLE_STATE.ERROR);
    assert.notEqual(state, TABLE_STATE.READY);
  });

  it('config 未就绪且未加载、无错误 → error（防御分支，绝不伪装成 empty/ready）', () => {
    assert.equal(
      resolveTableState({ configLoading: false, listLoading: false, error: null, rows: [], config: null }),
      TABLE_STATE.ERROR,
    );
  });

  it('同一输入恒输出同一状态（确定性）', () => {
    const input = { configLoading: false, listLoading: false, error: null, rows: [{ id: 2 }], config: {} };
    assert.equal(resolveTableState(input), resolveTableState(input));
    assert.equal(resolveTableState(input), TABLE_STATE.READY);
  });

  it('正向结果（ready）与 fallback/错误态明显不同（强测试 12）', () => {
    const ready = resolveTableState({ config: {}, rows: [{ id: 1 }], configLoading: false, listLoading: false, error: null });
    assert.equal(ready, TABLE_STATE.READY);
    for (const errorCategory of ['forbidden', 'api-disabled', 'network', 'server']) {
      assert.notEqual(
        resolveTableState({ config: {}, rows: [{ id: 1 }], configLoading: false, listLoading: false, error: { category: errorCategory } }),
        ready,
      );
    }
  });
});

describe('isStaleResponse — 旧响应不得覆盖新状态（强测试 5）', () => {
  it('序号落后 → 陈旧；序号一致 → 有效', () => {
    assert.equal(isStaleResponse(1, 2), true, 'older request seq must be stale');
    assert.equal(isStaleResponse(5, 1), true, 'non-current request seq must be stale');
    assert.equal(isStaleResponse(2, 2), false, 'current request seq must be accepted');
  });

  it('快速切换资源的语义：新资源序号 +1 后，旧资源在途响应全部陈旧', () => {
    const oldSeq = 3;
    const newSeq = oldSeq + 1; // 资源切换时递增
    assert.equal(isStaleResponse(oldSeq, newSeq), true);
    assert.equal(isStaleResponse(newSeq, newSeq), false);
  });

  it('搜索/翻页连续触发的语义：仅最新一次请求可写状态', () => {
    let latest = 10;
    for (const fired of [8, 9, 10]) {
      assert.equal(isStaleResponse(fired, latest), fired !== latest, `seq ${fired} vs latest ${latest}`);
    }
  });
});

describe('isConfigUnavailable — 配置未就绪禁用搜索/刷新/新增（PR #5 审查整改）', () => {
  it('config 为 null（加载中/加载失败/尚无配置三形态）→ true（控件禁用）', () => {
    assert.equal(isConfigUnavailable(null), true);
    assert.equal(isConfigUnavailable(undefined), true);
  });

  it('config 已就绪（空对象）→ false（控件可用，正向对照）', () => {
    assert.equal(isConfigUnavailable({}), false);
  });

  it('正负对照：失败态（null）与就绪态（对象）明显不同', () => {
    assert.notEqual(isConfigUnavailable(null), isConfigUnavailable({}));
  });

  it('三形态（加载中/失败/尚无配置）对齐：只要 config 未就绪，无论呈现何种状态控件都禁用', () => {
    const cases = [
      // [describe, resolveTableState 输入, 期望状态, 期望禁用]
      ['配置加载中', { configLoading: true, listLoading: false, error: null, rows: [], config: null }, TABLE_STATE.CONFIG_LOADING, true],
      ['配置失败(403)', { configLoading: false, listLoading: false, error: { category: 'forbidden' }, rows: [], config: null }, TABLE_STATE.UNAUTHORIZED, true],
      ['配置失败(网络)', { configLoading: false, listLoading: false, error: { category: 'network' }, rows: [], config: null }, TABLE_STATE.ERROR, true],
      ['尚无配置(防御)', { configLoading: false, listLoading: false, error: null, rows: [], config: null }, TABLE_STATE.ERROR, true],
      ['配置就绪(空列表)', { configLoading: false, listLoading: false, error: null, rows: [], config: {} }, TABLE_STATE.EMPTY, false],
      ['配置就绪(有数据)', { configLoading: false, listLoading: false, error: null, rows: [{ id: 1 }], config: {} }, TABLE_STATE.READY, false],
    ];
    for (const [label, input, expectedState, expectedUnavailable] of cases) {
      assert.equal(resolveTableState(input), expectedState, `${label} 状态不符`);
      assert.equal(isConfigUnavailable(input.config), expectedUnavailable, `${label} 禁用口径不符`);
    }
  });

  it('与 resolveTableState 的语义对齐：config=null 且 configLoading=false（配置失败）→ 错误态同时控件禁用', () => {
    const state = resolveTableState({ configLoading: false, listLoading: false, error: { category: 'forbidden' }, rows: [], config: null });
    assert.equal(state, TABLE_STATE.UNAUTHORIZED);
    assert.equal(isConfigUnavailable(null), true, 'error state with no config must keep controls disabled');
  });
});
