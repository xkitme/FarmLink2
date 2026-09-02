// 116g-B request() 行为契约（fetch mock，无真实网络）
// 覆盖工作单强测试 2/3/4：只有 401 清会话+跳转；写请求携带 credentials+CSRF；
// GET 可控重试、写请求绝不自动重试；失败绝不展示成功提示。
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

let fetchCalls;
let fetchBehaviors;
let originalFetch;
let locationReplaceCalls;
let feedbackCalls;

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function loadRequest() {
  return import('../src/api/request.js');
}

describe('116g-B request() — 分类、仅 401 登出、重试与凭据契约', () => {
  let requestMod;

  beforeEach(async () => {
    fetchCalls = [];
    fetchBehaviors = [];
    locationReplaceCalls = [];
    feedbackCalls = [];

    globalThis.document = { cookie: 'csrf_token=csrf-token-116g' };
    globalThis.window = {
      location: { origin: 'http://localhost', replace: (url) => locationReplaceCalls.push(url) },
    };

    originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
      const call = { url, init: init ? { ...init } : {} };
      fetchCalls.push(call);
      const behavior = fetchBehaviors.length ? fetchBehaviors.shift() : null;
      if (behavior) return behavior(call);
      return jsonResponse({ code: 200, data: { ok: true } });
    };

    // 捕获全局 message 调用（断言：失败路径绝不出现 success）
    const { setFeedbackMessage } = await import('../src/api/feedback.js');
    setFeedbackMessage({
      success: (...args) => feedbackCalls.push(['success', ...args]),
      error: (...args) => feedbackCalls.push(['error', ...args]),
      warning: (...args) => feedbackCalls.push(['warning', ...args]),
      info: (...args) => feedbackCalls.push(['info', ...args]),
      loading: (...args) => feedbackCalls.push(['loading', ...args]),
      open: (...args) => feedbackCalls.push(['open', ...args]),
      destroy: (...args) => feedbackCalls.push(['destroy', ...args]),
    });

    const { setCurrentUser } = await import('../src/api/auth.js');
    setCurrentUser({ id: 1, username: 'admin' });
    requestMod = null;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete globalThis.document;
    delete globalThis.window;
  });

  async function req() {
    if (!requestMod) requestMod = await loadRequest();
    return requestMod;
  }

  function noSuccessFeedback() {
    assert.equal(
      feedbackCalls.filter((call) => call[0] === 'success').length,
      0,
      `failure path must never show success feedback: ${JSON.stringify(feedbackCalls)}`,
    );
  }

  it('成功：返回 payload.data，携带 credentials:include', async () => {
    const { request } = await req();
    const data = await request('/admin/test', { method: 'GET' });
    assert.deepEqual(data, { ok: true });
    assert.equal(fetchCalls[0].init.credentials, 'include');
  });

  it('401（40101）→ clearSession + 跳转 /admin/login?reason=expired + 不弹错误提示', async () => {
    const { request } = await req();
    fetchBehaviors.push(() => jsonResponse({ code: 40101, msg: '会话已失效' }, 401));

    await assert.rejects(() => request('/admin/test', { method: 'GET' }), (err) => {
      assert.equal(err.category, 'unauthenticated');
      return true;
    });

    assert.deepEqual(locationReplaceCalls, ['/admin/login?reason=expired']);
    const { getCurrentUser } = await import('../src/api/auth.js');
    assert.deepEqual(getCurrentUser(), {}, 'clearSession must have been called');
    noSuccessFeedback();
  });

  it('40301 权限不足 → 分类 forbidden，不清会话、不跳转，error 提示一次', async () => {
    const { request } = await req();
    fetchBehaviors.push(() => jsonResponse({ code: 40301, msg: '权限不足' }, 403));

    await assert.rejects(() => request('/admin/test', { method: 'GET' }), (err) => {
      assert.equal(err.category, 'forbidden');
      assert.equal(err.code, 40301);
      assert.equal(err.message, '权限不足');
      return true;
    });

    assert.equal(locationReplaceCalls.length, 0, '403 must not redirect');
    const { getCurrentUser } = await import('../src/api/auth.js');
    assert.deepEqual(getCurrentUser(), { id: 1, username: 'admin' }, 'session cache must be retained');
    assert.deepEqual(feedbackCalls.filter((c) => c[0] === 'error'), [['error', '权限不足']]);
    noSuccessFeedback();
  });

  it('40301 CSRF 校验失败 → 分类 csrf，不清会话、不跳转', async () => {
    const { request } = await req();
    fetchBehaviors.push(() => jsonResponse({ code: 40301, msg: 'CSRF 校验失败：token 不匹配' }, 403));

    await assert.rejects(() => request('/admin/test', { method: 'POST', body: {} }), (err) => {
      assert.equal(err.category, 'csrf');
      return true;
    });

    assert.equal(locationReplaceCalls.length, 0, 'CSRF failure must not redirect');
    noSuccessFeedback();
  });

  it('40301 功能已关闭 → 分类 api-disabled，不清会话、不跳转', async () => {
    const { request } = await req();
    fetchBehaviors.push(() => jsonResponse({ code: 40301, msg: '功能已关闭：ai_chat' }, 403));

    await assert.rejects(() => request('/admin/test', { method: 'GET' }), (err) => {
      assert.equal(err.category, 'api-disabled');
      return true;
    });

    assert.equal(locationReplaceCalls.length, 0);
    noSuccessFeedback();
  });

  it('42901 → 分类 rate-limited，不清会话、不跳转', async () => {
    const { request } = await req();
    fetchBehaviors.push(() => jsonResponse({ code: 42901, msg: '请求过于频繁，请稍后再试（admin-write）' }, 429));

    await assert.rejects(() => request('/admin/test', { method: 'POST', body: {} }), (err) => {
      assert.equal(err.category, 'rate-limited');
      return true;
    });

    assert.equal(locationReplaceCalls.length, 0, '429 must not redirect');
    noSuccessFeedback();
  });

  it('50001 → 分类 server，不清会话、不跳转', async () => {
    const { request } = await req();
    fetchBehaviors.push(() => jsonResponse({ code: 50001, msg: '服务器内部错误' }, 500));

    await assert.rejects(() => request('/admin/test', { method: 'GET' }), (err) => {
      assert.equal(err.category, 'server');
      return true;
    });

    assert.equal(locationReplaceCalls.length, 0, '5xx must not redirect');
    noSuccessFeedback();
  });

  it('40001 → 分类 validation，不清会话、不跳转', async () => {
    const { request } = await req();
    fetchBehaviors.push(() => jsonResponse({ code: 40001, msg: '参数校验失败' }, 400));

    await assert.rejects(() => request('/admin/test', { method: 'POST', body: {} }), (err) => {
      assert.equal(err.category, 'validation');
      return true;
    });

    assert.equal(locationReplaceCalls.length, 0);
    noSuccessFeedback();
  });

  it('断网（fetch 抛错）→ 分类 network，不清会话、不跳转', async () => {
    const { request } = await req();
    fetchBehaviors.push(() => {
      throw new TypeError('Failed to fetch');
    });

    await assert.rejects(() => request('/admin/test', { method: 'GET' }), (err) => {
      assert.equal(err.category, 'network');
      return true;
    });

    assert.equal(locationReplaceCalls.length, 0, 'network failure must not redirect');
    const { getCurrentUser } = await import('../src/api/auth.js');
    assert.deepEqual(getCurrentUser(), { id: 1, username: 'admin' }, 'session cache retained on network failure');
    noSuccessFeedback();
  });

  it('409（冲突）→ 分类 conflict，不清会话、不跳转、不自动重试', async () => {
    const { request } = await req();
    fetchBehaviors.push(() => jsonResponse({ code: 200, msg: 'data conflict' }, 409));

    await assert.rejects(() => request('/admin/test', { method: 'PUT', body: {}, retries: 3, retryDelayMs: 0 }), (err) => {
      assert.equal(err.category, 'conflict');
      assert.equal(err.status, 409);
      return true;
    });

    assert.equal(locationReplaceCalls.length, 0, '409 must not redirect');
    assert.equal(fetchCalls.length, 1, '409 冲突写请求绝不自动重试');
    const { getCurrentUser } = await import('../src/api/auth.js');
    assert.deepEqual(getCurrentUser(), { id: 1, username: 'admin' }, 'session cache retained on conflict');
    noSuccessFeedback();
  });

  it('422（不可处理）→ 分类 validation，不清会话、不跳转', async () => {
    const { request } = await req();
    fetchBehaviors.push(() => jsonResponse({ code: 200, msg: 'unprocessable' }, 422));

    await assert.rejects(() => request('/admin/test', { method: 'POST', body: {} }), (err) => {
      assert.equal(err.category, 'validation');
      assert.equal(err.status, 422);
      return true;
    });

    assert.equal(locationReplaceCalls.length, 0, '422 must not redirect');
    noSuccessFeedback();
  });

  it('写请求继续携带 credentials:include + X-CSRF-Token（强测试 3）', async () => {
    const { request } = await req();
    await request('/admin/test', { method: 'POST', body: { key: 'val' } });

    const call = fetchCalls[0];
    assert.equal(call.init.credentials, 'include');
    assert.equal(call.init.headers['X-CSRF-Token'], 'csrf-token-116g');
    assert.equal(call.init.body, JSON.stringify({ key: 'val' }));
  });

  it('GET 可控重试：断网 2 次后成功（retries=2）→ 共 3 次请求', async () => {
    const { request } = await req();
    fetchBehaviors.push(() => { throw new TypeError('Failed to fetch'); });
    fetchBehaviors.push(() => { throw new TypeError('Failed to fetch'); });
    fetchBehaviors.push(() => jsonResponse({ code: 200, data: { recovered: true } }));

    const data = await request('/admin/test', { method: 'GET', retries: 2, retryDelayMs: 0 });
    assert.deepEqual(data, { recovered: true });
    assert.equal(fetchCalls.length, 3, 'expected 1 + 2 retries');
  });

  it('GET 受控重试：50001 后成功（retries=1）→ 共 2 次请求', async () => {
    const { request } = await req();
    fetchBehaviors.push(() => jsonResponse({ code: 50001, msg: '服务器内部错误' }, 500));
    fetchBehaviors.push(() => jsonResponse({ code: 200, data: { ok: true } }));

    const data = await request('/admin/test', { method: 'GET', retries: 1, retryDelayMs: 0 });
    assert.deepEqual(data, { ok: true });
    assert.equal(fetchCalls.length, 2);
  });

  it('GET 对确定性 4xx 不重试（40301 + retries=2）→ 仅 1 次请求', async () => {
    const { request } = await req();
    fetchBehaviors.push(() => jsonResponse({ code: 40301, msg: '权限不足' }, 403));

    await assert.rejects(() => request('/admin/test', { method: 'GET', retries: 2, retryDelayMs: 0 }));
    assert.equal(fetchCalls.length, 1, 'deterministic 4xx must not be retried');
  });

  it('POST/PUT/PATCH/DELETE 传 retries 也绝不自动重试（强测试 4）', async () => {
    const { request } = await req();
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      fetchCalls = [];
      fetchBehaviors = [() => { throw new TypeError('Failed to fetch'); }];
      await assert.rejects(
        () => request('/admin/test', { method, body: {}, retries: 5, retryDelayMs: 0 }),
        (err) => err.category === 'network',
      );
      assert.equal(fetchCalls.length, 1, `${method} must send exactly 1 request despite retries`);
      noSuccessFeedback();
    }
  });

  it('GET 默认不重试（不传 retries，断网）→ 仅 1 次请求', async () => {
    const { request } = await req();
    fetchBehaviors.push(() => { throw new TypeError('Failed to fetch'); });

    await assert.rejects(() => request('/admin/test', { method: 'GET' }));
    assert.equal(fetchCalls.length, 1);
  });

  it('失败路径全程不弹 success（覆盖所有分类，强测试 8 的请求层面）', async () => {
    const { request } = await req();
    const cases = [
      [{ code: 40101, msg: 'x' }, 401],
      [{ code: 40301, msg: '权限不足' }, 403],
      [{ code: 40301, msg: 'CSRF 校验失败：缺少 token' }, 403],
      [{ code: 40301, msg: '功能已关闭：x' }, 403],
      [{ code: 42901, msg: 'x' }, 429],
      [{ code: 50001, msg: 'x' }, 500],
      [{ code: 40001, msg: 'x' }, 400],
    ];
    for (const [payload, status] of cases) {
      fetchBehaviors = [() => jsonResponse(payload, status)];
      await assert.rejects(() => request('/admin/test', { method: 'GET' }));
    }
    noSuccessFeedback();
  });
});
