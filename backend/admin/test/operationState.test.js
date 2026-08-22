// 116g-B 写操作协调器与删除确认（强测试）
// 整改 #4：createWriteOperation 是 ResourcePage 真实消费的同一实现（替代 reduceWriteOp 平行模型），
// 强测试覆盖真实调用链：连续提交只发一次写请求、失败不触发成功副作用、成功副作用恰好一次、删除防重。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDeleteConfirmText,
  createWriteOperation,
  primaryRecordText,
} from '../src/policies/operationState.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('createWriteOperation — 真实调用链（整改 #4，页面与测试共用同一实现）', () => {
  it('连续提交（并发两次 run）：perform 只执行一次，第二次返回 duplicate（只发一次 POST/PUT）', async () => {
    let calls = 0;
    let release;
    const gate = new Promise((res) => {
      release = res;
    });
    const op = createWriteOperation({
      perform: async () => {
        calls += 1;
        await gate;
        return { saved: true };
      },
      onSuccess: () => {},
      onFailure: () => {},
    });

    const p1 = op.run({ values: { title: 'a' } });
    const p2 = op.run({ values: { title: 'a' } });
    release();
    const [r1, r2] = await Promise.all([p1, p2]);

    assert.equal(calls, 1, 'double submit must produce exactly one write request');
    assert.equal(r1.duplicate, false);
    assert.equal(r1.ok, true);
    assert.deepEqual(r1.result, { saved: true });
    assert.equal(r2.duplicate, true, 'second run must be rejected as duplicate');
    assert.equal(r2.ok, false);
  });

  it('失败：perform 抛错 → onFailure 恰好一次、onSuccess 零次（不关弹窗/不清表单/不弹成功/不刷新）', async () => {
    let success = 0;
    let failure = 0;
    let failedWith = null;
    const op = createWriteOperation({
      perform: async () => {
        throw new Error('40301 权限不足');
      },
      onSuccess: () => {
        success += 1;
      },
      onFailure: (error) => {
        failure += 1;
        failedWith = error;
      },
    });

    const r = await op.run({ values: { title: 'a' } });
    assert.equal(r.ok, false);
    assert.equal(r.duplicate, false);
    assert.equal(r.error.message, '40301 权限不足');
    assert.equal(success, 0, 'failure must never trigger success callback (no close/no toast/no refresh)');
    assert.equal(failure, 1);
    assert.equal(failedWith.message, '40301 权限不足');
  });

  it('成功：onSuccess 恰好一次并携带 perform 结果（成功提示/刷新只触发一次）', async () => {
    let success = 0;
    let got = null;
    const op = createWriteOperation({
      perform: async (payload) => ({ saved: true, payload }),
      onSuccess: (result) => {
        success += 1;
        got = result;
      },
      onFailure: () => {},
    });

    const r = await op.run({ values: { id: 9 } });
    assert.equal(r.ok, true);
    assert.equal(success, 1, 'success callback must run exactly once');
    assert.deepEqual(got, { saved: true, payload: { values: { id: 9 } } });
  });

  it('失败后 busy 释放：再次提交可正常执行（不会永久卡死）', async () => {
    let calls = 0;
    const op = createWriteOperation({
      perform: async () => {
        calls += 1;
        if (calls === 1) throw new Error('first fails');
        return 'ok2';
      },
      onSuccess: () => {},
      onFailure: () => {},
    });

    const r1 = await op.run({});
    assert.equal(r1.ok, false);
    const r2 = await op.run({});
    assert.equal(r2.ok, true);
    assert.equal(calls, 2);
  });

  it('isBusy：进行中 true、结束后 false（供 UI 处理中状态）', async () => {
    let release;
    const gate = new Promise((res) => {
      release = res;
    });
    const op = createWriteOperation({
      perform: () => gate,
      onSuccess: () => {},
      onFailure: () => {},
    });
    const p = op.run({});
    assert.equal(op.isBusy(), true);
    release();
    await p;
    assert.equal(op.isBusy(), false);
  });

  it('删除链路：连续确认（并发两次 run）只产生一次 DELETE（perform 一次）', async () => {
    let calls = 0;
    let release;
    const gate = new Promise((res) => {
      release = res;
    });
    const op = createWriteOperation({
      perform: async ({ record }) => {
        calls += 1;
        await gate;
        return { deleted: record.id };
      },
      onSuccess: () => {},
      onFailure: () => {},
    });

    const pA = op.run({ record: { id: 5 } });
    const pB = op.run({ record: { id: 5 } });
    release();
    const [a, b] = await Promise.all([pA, pB]);
    assert.equal(calls, 1, 'double confirm must produce exactly one DELETE');
    assert.equal(a.duplicate, false);
    assert.equal(b.duplicate, true);
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
