// B17 & B18 — Admin auth.js & request.js characterization tests
// Node built-in test runner; mocks browser globals before dynamic import.
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

let fetchCalls;
let fetchResponse;
let originalFetch;
let locationReplaceCalls;
let originalSetTimeout;

function resetModuleState(mod) {
  // clear cached user between tests so state doesn't leak
  mod.setCurrentUser(null);
}

describe('B17: auth.js — fetchUser / isLoggedIn / getCsrfToken', () => {
  let authMod;

  beforeEach(() => {
    fetchCalls = [];
    fetchResponse = null;
    locationReplaceCalls = [];

    globalThis.document = { cookie: '' };
    globalThis.window = { location: { origin: 'http://localhost', replace: (url) => locationReplaceCalls.push(url) } };

    originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
      const call = { url, init: { ...init } };
      fetchCalls.push(call);
      if (fetchResponse) return fetchResponse(call);
      return new Response(JSON.stringify({ code: 200, data: { id: 1, username: 'admin' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    delete globalThis.document;
    delete globalThis.window;
    // re-import to get fresh module state next time
    authMod = null;
  });

  async function loadAuth() {
    if (!authMod) {
      authMod = await import('../src/api/auth.js');
    }
    return authMod;
  }

  it('fetchUser calls /api/v1/auth/me with credentials:include and Accept:application/json', async () => {
    const { fetchUser } = await loadAuth();
    await fetchUser();
    assert.equal(fetchCalls.length, 1, 'exactly 1 fetch call');
    const call = fetchCalls[0];
    assert.equal(call.url, '/api/v1/auth/me');
    assert.equal(call.init.credentials, 'include');
    assert.equal(call.init.headers.Accept, 'application/json');
  });

  it('fetchUser returns payload.data and caches user on success (resp.ok + code===200)', async () => {
    const { fetchUser, getCurrentUser, setCurrentUser } = await loadAuth();
    setCurrentUser(null); // clear cache

    const userData = { id: 1, username: 'admin', role: 'ADMIN' };
    fetchResponse = () =>
      new Response(JSON.stringify({ code: 200, data: userData }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    const result = await fetchUser();
    assert.deepEqual(result, userData);
    // verify cached
    assert.deepEqual(getCurrentUser(), userData);
  });

  it('fetchUser returns null and clears _cachedUser on non-200 response', async () => {
    const { fetchUser, getCurrentUser, setCurrentUser } = await loadAuth();
    setCurrentUser({ id: 99 }); // pre-populate cache

    fetchResponse = () =>
      new Response(JSON.stringify({ code: 40101, msg: 'unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });

    const result = await fetchUser();
    assert.equal(result, null);
    // source: getCurrentUser() returns _cachedUser || {} → {} when null
    assert.deepEqual(getCurrentUser(), {});
  });

  it('fetchUser returns null on network error (catch path)', async () => {
    const { fetchUser, getCurrentUser, setCurrentUser } = await loadAuth();
    setCurrentUser({ id: 99 });

    fetchResponse = () => {
      throw new Error('network error');
    };

    const result = await fetchUser();
    assert.equal(result, null);
    // source: getCurrentUser() returns _cachedUser || {} → {} when null
    assert.deepEqual(getCurrentUser(), {});
  });

  it('isLoggedIn returns Boolean(await fetchUser()) — true when user exists', async () => {
    const { isLoggedIn } = await loadAuth();
    fetchResponse = () =>
      new Response(JSON.stringify({ code: 200, data: { id: 1 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    const result = await isLoggedIn();
    assert.equal(result, true);
  });

  it('isLoggedIn returns false when fetchUser returns null', async () => {
    const { isLoggedIn } = await loadAuth();
    fetchResponse = () =>
      new Response(JSON.stringify({ code: 40101 }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });

    const result = await isLoggedIn();
    assert.equal(result, false);
  });

  it('getCsrfToken parses csrf_token from document.cookie', async () => {
    const { getCsrfToken } = await loadAuth();
    globalThis.document.cookie = 'other=val; csrf_token=abc123def; session=xyz';
    assert.equal(getCsrfToken(), 'abc123def');
  });

  it('getCsrfToken returns null when csrf_token absent from cookie', async () => {
    const { getCsrfToken } = await loadAuth();
    globalThis.document.cookie = 'other=val; session=xyz';
    assert.equal(getCsrfToken(), null);
  });
});

describe('B18: request.js — CSRF injection + 40101 handling', () => {
  let requestMod;

  beforeEach(() => {
    fetchCalls = [];
    fetchResponse = null;
    locationReplaceCalls = [];

    globalThis.document = { cookie: 'csrf_token=test-csrf-token-42' };
    globalThis.window = { location: { origin: 'http://localhost', replace: (url) => locationReplaceCalls.push(url) } };

    originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
      const call = { url, init: init ? { ...init } : {} };
      fetchCalls.push(call);
      if (fetchResponse) return fetchResponse(call);
      return new Response(JSON.stringify({ code: 200, data: { ok: true } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    // Mock import.meta.env for VITE_API_BASE
    // request.js uses import.meta.env.VITE_API_BASE at module scope
    // We need this before dynamic import
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete globalThis.document;
    delete globalThis.window;
    requestMod = null;
  });

  async function loadRequest() {
    if (!requestMod) {
      requestMod = await import('../src/api/request.js');
    }
    return requestMod;
  }

  it('request() injects X-CSRF-Token header for POST (write method)', async () => {
    const { request } = await loadRequest();
    await request('/admin/test', { method: 'POST', body: { key: 'val' } });

    const call = fetchCalls[0];
    assert.ok(call.init.headers['X-CSRF-Token'], 'X-CSRF-Token should be present');
    assert.equal(call.init.headers['X-CSRF-Token'], 'test-csrf-token-42');
  });

  it('request() injects X-CSRF-Token for PUT', async () => {
    const { request } = await loadRequest();
    await request('/admin/test', { method: 'PUT', body: { key: 'val' } });

    assert.ok(fetchCalls[0].init.headers['X-CSRF-Token']);
    assert.equal(fetchCalls[0].init.headers['X-CSRF-Token'], 'test-csrf-token-42');
  });

  it('request() injects X-CSRF-Token for DELETE', async () => {
    const { request } = await loadRequest();
    await request('/admin/test', { method: 'DELETE' });

    assert.ok(fetchCalls[0].init.headers['X-CSRF-Token']);
    assert.equal(fetchCalls[0].init.headers['X-CSRF-Token'], 'test-csrf-token-42');
  });

  it('request() injects X-CSRF-Token for PATCH', async () => {
    const { request } = await loadRequest();
    await request('/admin/test', { method: 'PATCH', body: { key: 'val' } });

    assert.ok(fetchCalls[0].init.headers['X-CSRF-Token']);
    assert.equal(fetchCalls[0].init.headers['X-CSRF-Token'], 'test-csrf-token-42');
  });

  it('request() does NOT inject X-CSRF-Token for GET', async () => {
    const { request } = await loadRequest();
    await request('/admin/test', { method: 'GET' });

    const headers = fetchCalls[0].init.headers || {};
    assert.equal('X-CSRF-Token' in headers, false, 'GET should not have X-CSRF-Token');
  });

  it('request() carries credentials:include on all fetch calls', async () => {
    const { request } = await loadRequest();
    await request('/admin/test', { method: 'GET' });
    await request('/admin/test', { method: 'POST', body: {} });

    for (const call of fetchCalls) {
      assert.equal(call.init.credentials, 'include', `credentials:include missing for ${call.init.method || 'GET'}`);
    }
  });

  it('request() handles 40101: calls clearSession and redirects to /admin/login?reason=expired', async () => {
    const { request } = await loadRequest();
    // The auth module's _cachedUser needs to be set first
    const authMod = await import('../src/api/auth.js');
    authMod.setCurrentUser({ id: 1 });

    fetchResponse = () =>
      new Response(JSON.stringify({ code: 40101, msg: 'session expired' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });

    try {
      await request('/admin/test', { method: 'GET' });
    } catch (_) {
      // expected to reject
    }

    // Verify clearSession was called — _cachedUser is null, getCurrentUser() returns {}
    assert.deepEqual(authMod.getCurrentUser(), {}, 'clearSession should set _cachedUser to null');

    // Verify redirect
    assert.ok(locationReplaceCalls.length >= 1, 'location.replace should be called');
    assert.ok(
      locationReplaceCalls.some((url) => url === '/admin/login?reason=expired'),
      `expected redirect to /admin/login?reason=expired, got ${JSON.stringify(locationReplaceCalls)}`,
    );
  });

  it('request() does NOT redirect on non-40101 error codes', async () => {
    const { request } = await loadRequest();
    locationReplaceCalls = [];

    fetchResponse = () =>
      new Response(JSON.stringify({ code: 40401, msg: 'not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });

    try {
      await request('/admin/test', { method: 'GET' });
    } catch (_) {
      // expected to reject
    }

    assert.equal(locationReplaceCalls.length, 0, 'should not redirect on non-40101 errors');
  });
});
