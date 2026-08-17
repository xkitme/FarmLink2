// 116g-B 写操作状态机与删除确认（纯函数强测试）
// 覆盖工作单强测试 6（双击只发一次）、7（失败保留表单语义）、
// 8（成功只刷新一次/成功消息一次）、10（删除确认含具体标识）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  WRITE_OP_PHASE,
  buildDeleteConfirmText,
  primaryRecordText,
  reduceWriteOp,
} from '../src/policies/operationState.js';

describe('reduceWriteOp — 写操作状态机（强测试 6/7/8）', () => {
  it('idle --start--> submitting（首次提交被接受）', () => {
    const next = reduceWriteOp({ phase: WRITE_OP_PHASE.IDLE }, { type: 'start' });
    assert.equal(next.phase, WRITE_OP_PHASE.SUBMITTING);
    assert.equal(next.duplicate, false);
  });

  it('submitting --start--> submitting + duplicate=true（双击拦截，不产生第二次请求）', () => {
    const first = reduceWriteOp({ phase: WRITE_OP_PHASE.IDLE }, { type: 'start' });
    const second = reduceWriteOp(first, { type: 'start' });
    assert.equal(second.phase, WRITE_OP_PHASE.SUBMITTING);
    assert.equal(second.duplicate, true, 'second start must be flagged duplicate');
  });

  it('submitting --success--> succeeded + refreshOnce=true（成功后恰好一次刷新）', () => {
    const next = reduceWriteOp({ phase: WRITE_OP_PHASE.SUBMITTING }, { type: 'success' });
    assert.equal(next.phase, WRITE_OP_PHASE.SUCCEEDED);
    assert.equal(next.refreshOnce, true);
  });

  it('submitting --failure--> failed（携带分类/文案，无任何成功标记，表单保留）', () => {
    const next = reduceWriteOp(
      { phase: WRITE_OP_PHASE.SUBMITTING },
      { type: 'failure', category: 'validation', message: '参数校验失败' },
    );
    assert.equal(next.phase, WRITE_OP_PHASE.FAILED);
    assert.equal(next.category, 'validation');
    assert.equal(next.message, '参数校验失败');
    assert.equal(next.refreshOnce, undefined, 'failure must not carry refresh intent');
    assert.equal(next.duplicate, false);
  });

  it('failed --dismiss--> idle；idle --dismiss--> idle（幂等）', () => {
    assert.equal(reduceWriteOp({ phase: WRITE_OP_PHASE.FAILED }, { type: 'dismiss' }).phase, WRITE_OP_PHASE.IDLE);
    assert.equal(reduceWriteOp({ phase: WRITE_OP_PHASE.IDLE }, { type: 'dismiss' }).phase, WRITE_OP_PHASE.IDLE);
  });

  it('完整成功链路：idle → submitting → succeeded → idle，refreshOnce 只在 success 出现一次', () => {
    let state = { phase: WRITE_OP_PHASE.IDLE };
    const refreshSignals = [];
    state = reduceWriteOp(state, { type: 'start' });
    if (state.duplicate) refreshSignals.push('bad');
    state = reduceWriteOp(state, { type: 'success' });
    if (state.refreshOnce) refreshSignals.push('refresh');
    state = reduceWriteOp(state, { type: 'dismiss' });
    assert.deepEqual(refreshSignals, ['refresh'], 'exactly one refresh signal on success');
    assert.equal(state.phase, WRITE_OP_PHASE.IDLE);
  });

  it('未知事件/空状态：保持原相位且不产生重复或刷新信号（防御）', () => {
    const next = reduceWriteOp({ phase: WRITE_OP_PHASE.IDLE }, { type: 'nonsense' });
    assert.equal(next.phase, WRITE_OP_PHASE.IDLE);
    assert.equal(next.duplicate, false);
    assert.equal(next.refreshOnce, undefined);
  });
});

describe('buildDeleteConfirmText — 删除确认必须包含具体标识（强测试 10）', () => {
  it('包含资源标题 + id + 首字段值 + 不可恢复提示', () => {
    const text = buildDeleteConfirmText({
      resourceTitle: '订单管理',
      record: { id: 128, orderNo: 'NO20260501' },
      primaryValue: 'NO20260501',
    });
    assert.equal(text, '确认删除「订单管理」#128（NO20260501）？该操作不可恢复。');
    assert.ok(text.includes('订单管理'), 'must include resource title');
    assert.ok(text.includes('128'), 'must include record id');
    assert.ok(text.includes('NO20260501'), 'must include primary value');
  });

  it('缺 primaryValue 时回退 record 首字段值，仍含 id', () => {
    const text = buildDeleteConfirmText({
      resourceTitle: '订单管理',
      record: { id: 128, orderNo: 'NO20260501' },
      listFields: ['orderNo'],
    });
    assert.equal(text, '确认删除「订单管理」#128（NO20260501）？该操作不可恢复。');
  });

  it('仅 id 时也不丢标识，且不重复展示括号值', () => {
    const text = buildDeleteConfirmText({ resourceTitle: '订单管理', record: { id: 128 } });
    assert.equal(text, '确认删除「订单管理」#128？该操作不可恢复。');
  });

  it('旧口径固定文案「确认删除这条记录？」与精确文案明显不同', () => {
    const text = buildDeleteConfirmText({ resourceTitle: '订单管理', record: { id: 128, orderNo: 'NO1' } });
    assert.notEqual(text, '确认删除这条记录？');
    assert.ok(!text.includes('这条记录'), 'must not fall back to generic copy');
  });
});

describe('primaryRecordText — 首字段值 > id > 空串', () => {
  it('取首个列表字段的值', () => {
    assert.equal(primaryRecordText({ orderNo: 'NO1', id: 5 }, ['orderNo', 'status']), 'NO1');
  });

  it('首字段缺失时回退 id', () => {
    assert.equal(primaryRecordText({ orderNo: null, id: 5 }, ['orderNo']), '5');
  });

  it('全缺失回退空串', () => {
    assert.equal(primaryRecordText({}, ['orderNo']), '');
    assert.equal(primaryRecordText({ id: null }, ['orderNo']), '');
  });
});
