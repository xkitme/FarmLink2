// 116x-60pct 危险操作策略（纯函数强测试）
// 覆盖：危险操作登记正负 / 二次确认要求 / disabled 状态矩阵（config 缺失、
// 错误态、无权限、API 关闭、busy、批量未选中）/ 正负对照明显不同。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DANGEROUS_ACTIONS,
  dangerousActionAvailability,
  isDangerousAction,
  requiresConfirmation,
} from '../src/policies/dangerousOperationPolicy.js';

describe('isDangerousAction — 危险操作登记（正负对照）', () => {
  it('delete / batch-delete 为登记过的危险操作', () => {
    assert.equal(isDangerousAction(DANGEROUS_ACTIONS.DELETE), true);
    assert.equal(isDangerousAction(DANGEROUS_ACTIONS.BATCH_DELETE), true);
  });

  it('未登记动作（create/update/unknown）不是危险操作', () => {
    assert.equal(isDangerousAction('create'), false);
    assert.equal(isDangerousAction('update'), false);
    assert.equal(isDangerousAction(null), false);
    assert.equal(isDangerousAction(undefined), false);
  });
});

describe('requiresConfirmation — 危险操作必须二次确认', () => {
  it('危险操作 → true', () => {
    assert.equal(requiresConfirmation(DANGEROUS_ACTIONS.DELETE), true);
    assert.equal(requiresConfirmation(DANGEROUS_ACTIONS.BATCH_DELETE), true);
  });

  it('非危险操作 → false（正负明显不同）', () => {
    assert.equal(requiresConfirmation('create'), false);
  });
});

describe('dangerousActionAvailability — disabled 状态矩阵', () => {
  it('config 未就绪（加载中/失败/尚无）→ disabled + 明确原因', () => {
    const r = dangerousActionAvailability({
      actionType: DANGEROUS_ACTIONS.DELETE,
      configReady: false,
    });
    assert.equal(r.disabled, true);
    assert.match(r.reason, /资源配置未就绪/);
  });

  it('busy（写操作进行中）→ disabled，防双击', () => {
    const r = dangerousActionAvailability({
      actionType: DANGEROUS_ACTIONS.DELETE,
      configReady: true,
      busy: true,
    });
    assert.equal(r.disabled, true);
    assert.match(r.reason, /请勿重复提交/);
  });

  it('无权限（forbidden）→ disabled + 无权限原因', () => {
    const r = dangerousActionAvailability({
      actionType: DANGEROUS_ACTIONS.DELETE,
      configReady: true,
      tableErrorCategory: 'forbidden',
    });
    assert.equal(r.disabled, true);
    assert.match(r.reason, /无权限/);
  });

  it('API 关闭（api-disabled）→ disabled + 功能已关闭原因', () => {
    const r = dangerousActionAvailability({
      actionType: DANGEROUS_ACTIONS.DELETE,
      configReady: true,
      tableErrorCategory: 'api-disabled',
    });
    assert.equal(r.disabled, true);
    assert.match(r.reason, /功能已关闭/);
  });

  it('网络/服务端错误态 → disabled（错误态下不允许危险写）', () => {
    for (const category of ['network', 'server']) {
      const r = dangerousActionAvailability({
        actionType: DANGEROUS_ACTIONS.DELETE,
        configReady: true,
        tableErrorCategory: category,
      });
      assert.equal(r.disabled, true, `${category} 应禁用危险操作`);
      assert.ok(r.reason);
    }
  });

  it('其它错误态（csrf/rate-limited/unknown）→ disabled + 通用原因', () => {
    for (const category of ['csrf', 'rate-limited', 'unknown']) {
      const r = dangerousActionAvailability({
        actionType: DANGEROUS_ACTIONS.DELETE,
        configReady: true,
        tableErrorCategory: category,
      });
      assert.equal(r.disabled, true, `${category} 应禁用危险操作`);
      assert.match(r.reason, /错误态/);
    }
  });

  it('batch-delete 未选中记录 → disabled + 请先勾选原因', () => {
    const r = dangerousActionAvailability({
      actionType: DANGEROUS_ACTIONS.BATCH_DELETE,
      configReady: true,
      selectionCount: 0,
    });
    assert.equal(r.disabled, true);
    assert.match(r.reason, /请先勾选/);
  });

  it('全部就绪 → 可用（disabled=false 且 reason=null），与失败态明显不同', () => {
    const ok = dangerousActionAvailability({
      actionType: DANGEROUS_ACTIONS.DELETE,
      configReady: true,
      tableErrorCategory: null,
      busy: false,
    });
    assert.equal(ok.disabled, false);
    assert.equal(ok.reason, null);

    const blocked = dangerousActionAvailability({
      actionType: DANGEROUS_ACTIONS.DELETE,
      configReady: false,
    });
    assert.notEqual(ok.disabled, blocked.disabled, '可用与禁用结果必须不同');
    assert.notEqual(ok.reason, blocked.reason);
  });

  it('batch-delete 已选中（≥1）且就绪 → 可用', () => {
    const r = dangerousActionAvailability({
      actionType: DANGEROUS_ACTIONS.BATCH_DELETE,
      configReady: true,
      selectionCount: 3,
    });
    assert.equal(r.disabled, false);
  });
});
