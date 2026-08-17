// 116g-B ResourceTable 状态解析与竞态判定（纯函数强测试）
// 覆盖工作单强测试 5（旧响应不覆盖新状态）、11（loading/empty/error/unauthorized 不混淆）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  TABLE_STATE,
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
