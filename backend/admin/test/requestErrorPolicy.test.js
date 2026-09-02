// 116g-B 请求错误分类策略（纯函数强测试）
// 覆盖工作单强测试 1（八类精确分类）+ 分类间互斥 + 正/负对照（强测试 12）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ERROR_CATEGORY,
  ApiError,
  bootstrapDecision,
  classifyRequestError,
  isSessionExpired,
  isTransientFailure,
  resolveErrorMessage,
  shouldRetryRequest,
} from '../src/policies/requestErrorPolicy.js';

function classify(payload, status, networkError) {
  return classifyRequestError({ payload, status, networkError: networkError ?? null });
}

describe('classifyRequestError — 八类精确分类（强测试 1）', () => {
  it('40101 → unauthenticated（未认证）', () => {
    const r = classify({ code: 40101, msg: '会话已失效，请重新登录' }, 401);
    assert.equal(r.category, ERROR_CATEGORY.UNAUTHENTICATED);
    assert.equal(r.code, 40101);
    assert.equal(r.status, 401);
  });

  it('40301 + 权限不足 → forbidden（无权限）', () => {
    const r = classify({ code: 40301, msg: '权限不足' }, 403);
    assert.equal(r.category, ERROR_CATEGORY.FORBIDDEN);
  });

  it('40301 + CSRF 校验失败：缺少 token → csrf', () => {
    const r = classify({ code: 40301, msg: 'CSRF 校验失败：缺少 token' }, 403);
    assert.equal(r.category, ERROR_CATEGORY.CSRF);
  });

  it('40301 + CSRF 校验失败：token 不匹配 → csrf', () => {
    const r = classify({ code: 40301, msg: 'CSRF 校验失败：token 不匹配' }, 403);
    assert.equal(r.category, ERROR_CATEGORY.CSRF);
  });

  it('40301 + 功能已关闭：xxx → api-disabled（API 关闭）', () => {
    const r = classify({ code: 40301, msg: '功能已关闭：ai_chat' }, 403);
    assert.equal(r.category, ERROR_CATEGORY.API_DISABLED);
  });

  it('42901 → rate-limited（限流）', () => {
    const r = classify({ code: 42901, msg: '请求过于频繁，请稍后再试（admin-write）' }, 429);
    assert.equal(r.category, ERROR_CATEGORY.RATE_LIMITED);
  });

  it('50001 → server（服务端错误）', () => {
    const r = classify({ code: 50001, msg: '服务器内部错误' }, 500);
    assert.equal(r.category, ERROR_CATEGORY.SERVER);
  });

  it('60001 / 60002 → server（AI 忙/服务不可用归入服务端错误）', () => {
    assert.equal(classify({ code: 60001, msg: 'AI 服务繁忙' }, 503).category, ERROR_CATEGORY.SERVER);
    assert.equal(classify({ code: 60002, msg: '服务暂时不可用，请稍后重试' }, 503).category, ERROR_CATEGORY.SERVER);
  });

  it('40001 → validation（业务校验失败）', () => {
    const r = classify({ code: 40001, msg: '参数校验失败' }, 400);
    assert.equal(r.category, ERROR_CATEGORY.VALIDATION);
  });

  it('网络异常（fetch 抛错）→ network，且不带业务码', () => {
    const r = classify(null, null, new Error('Failed to fetch'));
    assert.equal(r.category, ERROR_CATEGORY.NETWORK);
    assert.equal(r.code, null);
  });

  it('断网 ≠ 未认证：network 分类与 unauthenticated 明显不同', () => {
    assert.notEqual(ERROR_CATEGORY.NETWORK, ERROR_CATEGORY.UNAUTHENTICATED);
    assert.equal(isSessionExpired(ERROR_CATEGORY.NETWORK), false);
  });
});

describe('classifyRequestError — HTTP 状态兜底与补充分类', () => {
  it('无信封 401 → unauthenticated', () => {
    assert.equal(classify(null, 401).category, ERROR_CATEGORY.UNAUTHENTICATED);
  });

  it('无信封 403 / 429 / 400 / 404 → forbidden / rate-limited / validation / not-found', () => {
    assert.equal(classify(null, 403).category, ERROR_CATEGORY.FORBIDDEN);
    assert.equal(classify(null, 429).category, ERROR_CATEGORY.RATE_LIMITED);
    assert.equal(classify(null, 400).category, ERROR_CATEGORY.VALIDATION);
    assert.equal(classify(null, 404).category, ERROR_CATEGORY.NOT_FOUND);
  });

  it('无信封 409 → conflict（数据冲突/已变更）；无信封 422 → validation（校验失败）', () => {
    const conflict = classify(null, 409);
    assert.equal(conflict.category, ERROR_CATEGORY.CONFLICT);
    assert.equal(isSessionExpired(conflict.category), false, '409 不清会话');
    assert.equal(isTransientFailure(conflict.category), false, '409 不自动重试');

    const unprocessable = classify(null, 422);
    assert.equal(unprocessable.category, ERROR_CATEGORY.VALIDATION);
    assert.equal(isSessionExpired(unprocessable.category), false, '422 不清会话');
    assert.equal(isTransientFailure(unprocessable.category), false, '422 不自动重试');

    // 正负对照：conflict 与 server / validation 明显不同
    assert.notEqual(conflict.category, ERROR_CATEGORY.SERVER);
    assert.notEqual(conflict.category, ERROR_CATEGORY.VALIDATION);
    assert.notEqual(unprocessable.category, ERROR_CATEGORY.CONFLICT);
  });

  it('无信封 502 / 503 / 500 → server', () => {
    assert.equal(classify(null, 502).category, ERROR_CATEGORY.SERVER);
    assert.equal(classify(null, 503).category, ERROR_CATEGORY.SERVER);
    assert.equal(classify(null, 500).category, ERROR_CATEGORY.SERVER);
  });

  it('40401 → not-found（资源不存在）', () => {
    const r = classify({ code: 40401, msg: '记录不存在' }, 404);
    assert.equal(r.category, ERROR_CATEGORY.NOT_FOUND);
  });

  it('未知业务码 99999 → unknown（绝不猜测为登出类）', () => {
    const r = classify({ code: 99999, msg: 'future' }, 400);
    assert.equal(r.category, ERROR_CATEGORY.UNKNOWN);
    assert.equal(isSessionExpired(r.category), false);
  });

  it('无 payload、无 status、无网络异常 → unknown', () => {
    assert.equal(classify(null, null, null).category, ERROR_CATEGORY.UNKNOWN);
  });

  it('code 200 但非成功路径 → 按 HTTP 状态兜底（500 → server，不当作成功）', () => {
    const r = classify({ code: 200, msg: 'x' }, 500);
    assert.equal(r.category, ERROR_CATEGORY.SERVER);
    assert.equal(isSessionExpired(r.category), false);
  });
});

describe('isSessionExpired — 只有未认证允许清理会话（强测试 2 的纯函数面）', () => {
  it('unauthenticated → true', () => {
    assert.equal(isSessionExpired(ERROR_CATEGORY.UNAUTHENTICATED), true);
  });

  it('403 / CSRF / 429 / 5xx / 断网 / 校验失败全部 → false', () => {
    for (const category of [
      ERROR_CATEGORY.FORBIDDEN,
      ERROR_CATEGORY.CSRF,
      ERROR_CATEGORY.API_DISABLED,
      ERROR_CATEGORY.RATE_LIMITED,
      ERROR_CATEGORY.NETWORK,
      ERROR_CATEGORY.SERVER,
      ERROR_CATEGORY.VALIDATION,
      ERROR_CATEGORY.NOT_FOUND,
      ERROR_CATEGORY.UNKNOWN,
    ]) {
      assert.equal(isSessionExpired(category), false, `${category} must not expire session`);
    }
  });
});

describe('isTransientFailure / shouldRetryRequest — GET 可控重试、写请求绝不重试（强测试 4）', () => {
  it('瞬时性失败 = network / server / rate-limited', () => {
    assert.equal(isTransientFailure(ERROR_CATEGORY.NETWORK), true);
    assert.equal(isTransientFailure(ERROR_CATEGORY.SERVER), true);
    assert.equal(isTransientFailure(ERROR_CATEGORY.RATE_LIMITED), true);
    for (const category of [
      ERROR_CATEGORY.UNAUTHENTICATED,
      ERROR_CATEGORY.FORBIDDEN,
      ERROR_CATEGORY.CSRF,
      ERROR_CATEGORY.API_DISABLED,
      ERROR_CATEGORY.VALIDATION,
      ERROR_CATEGORY.NOT_FOUND,
      ERROR_CATEGORY.UNKNOWN,
    ]) {
      assert.equal(isTransientFailure(category), false, `${category} is not transient`);
    }
  });

  it('GET + network + 未达上限 → 重试；达到上限 → 不重试', () => {
    assert.equal(
      shouldRetryRequest({ method: 'GET', category: ERROR_CATEGORY.NETWORK, attempt: 0, maxRetries: 2 }),
      true,
    );
    assert.equal(
      shouldRetryRequest({ method: 'GET', category: ERROR_CATEGORY.NETWORK, attempt: 2, maxRetries: 2 }),
      false,
    );
  });

  it('HEAD 与 GET 同口径；GET + 确定性 4xx → 不重试', () => {
    assert.equal(
      shouldRetryRequest({ method: 'HEAD', category: ERROR_CATEGORY.SERVER, attempt: 0, maxRetries: 1 }),
      true,
    );
    assert.equal(
      shouldRetryRequest({ method: 'GET', category: ERROR_CATEGORY.FORBIDDEN, attempt: 0, maxRetries: 3 }),
      false,
    );
    assert.equal(
      shouldRetryRequest({ method: 'GET', category: ERROR_CATEGORY.VALIDATION, attempt: 0, maxRetries: 3 }),
      false,
    );
  });

  it('POST/PUT/PATCH/DELETE 无论 retries 多少都绝不重试', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      assert.equal(
        shouldRetryRequest({ method, category: ERROR_CATEGORY.NETWORK, attempt: 0, maxRetries: 5 }),
        false,
        `${method} must never auto-retry`,
      );
    }
  });

  it('maxRetries=0 / 负数 → 不重试', () => {
    assert.equal(
      shouldRetryRequest({ method: 'GET', category: ERROR_CATEGORY.NETWORK, attempt: 0, maxRetries: 0 }),
      false,
    );
    assert.equal(
      shouldRetryRequest({ method: 'GET', category: ERROR_CATEGORY.NETWORK, attempt: 0, maxRetries: -1 }),
      false,
    );
  });
});

describe('resolveErrorMessage — 后端 msg 优先，分类默认文案兜底', () => {
  it('有后端 msg 时原样返回', () => {
    assert.equal(resolveErrorMessage(ERROR_CATEGORY.FORBIDDEN, '权限不足'), '权限不足');
  });

  it('无 msg 时返回分类默认文案（非空且明显不同）', () => {
    const network = resolveErrorMessage(ERROR_CATEGORY.NETWORK, '');
    const server = resolveErrorMessage(ERROR_CATEGORY.SERVER, '');
    assert.ok(network.length > 0);
    assert.ok(server.length > 0);
    assert.notEqual(network, server);
  });

  it('未知分类回退 unknown 文案', () => {
    const text = resolveErrorMessage('no-such-category', null);
    assert.equal(text, '请求失败，请稍后重试');
  });
});

describe('ApiError — message 契约兼容 + 分类/状态码可读取', () => {
  it('携带 category/code/status 且 message 为展示文案', () => {
    const err = new ApiError(ERROR_CATEGORY.RATE_LIMITED, '请求过于频繁，请稍后再试', { code: 42901, status: 429 });
    assert.ok(err instanceof Error);
    assert.equal(err.name, 'ApiError');
    assert.equal(err.category, ERROR_CATEGORY.RATE_LIMITED);
    assert.equal(err.code, 42901);
    assert.equal(err.status, 429);
    assert.equal(err.message, '请求过于频繁，请稍后再试');
  });
});

describe('bootstrapDecision — 登录引导态三分类（强测试 2/11 的引导面）', () => {
  it('有用户 → ok', () => {
    assert.equal(bootstrapDecision({ id: 1 }, null), 'ok');
  });

  it('无用户 + 未认证 → expired', () => {
    assert.equal(
      bootstrapDecision(null, { category: ERROR_CATEGORY.UNAUTHENTICATED }),
      'expired',
    );
  });

  it('无用户 + 断网/服务端/限流/403 → unavailable（不清会话、不跳登录）', () => {
    for (const category of [
      ERROR_CATEGORY.NETWORK,
      ERROR_CATEGORY.SERVER,
      ERROR_CATEGORY.RATE_LIMITED,
      ERROR_CATEGORY.FORBIDDEN,
      ERROR_CATEGORY.UNKNOWN,
    ]) {
      assert.equal(bootstrapDecision(null, { category }), 'unavailable', `${category} must be unavailable`);
    }
  });

  it('无用户 + 无分类信息 → unavailable（防御分支不误判为 expired）', () => {
    assert.equal(bootstrapDecision(null, null), 'unavailable');
  });
});
