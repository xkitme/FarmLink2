// B19 & B20 — Admin apiCatalog.js & resourceGroups.js characterization tests
// Node built-in test runner; pure functions, no browser mocks needed.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { API_CATALOG, flatApiCatalog } from '../src/apiCatalog.js';
import { RESOURCE_GROUPS } from '../src/resourceGroups.js';

describe('B19: apiCatalog.js — key entries + global key uniqueness', () => {
  let flat;

  it('flatApiCatalog returns a non-empty array', () => {
    flat = flatApiCatalog();
    assert.ok(Array.isArray(flat), 'flatApiCatalog should return an array');
    assert.ok(flat.length > 0, 'flatApiCatalog should not be empty');
  });

  it('all keys are globally unique (no duplicate key across any group)', () => {
    const keys = flat.map((item) => item.key);
    const unique = new Set(keys);
    assert.equal(keys.length, unique.size, `found ${keys.length - unique.size} duplicate key(s)`);
  });

  // ── Locked entries per 116d spec ──

  it('"dashboard" entry: GET /data/dashboard, auth=true', () => {
    const entry = flat.find((e) => e.key === 'dashboard');
    assert.ok(entry, 'dashboard entry must exist');
    assert.equal(entry.method, 'GET');
    assert.equal(entry.path, '/data/dashboard');
    assert.equal(entry.auth, true);
  });

  it('"ai-status" entry: GET /ai/status, auth=true', () => {
    const entry = flat.find((e) => e.key === 'ai-status');
    assert.ok(entry, 'ai-status entry must exist');
    assert.equal(entry.method, 'GET');
    assert.equal(entry.path, '/ai/status');
    assert.equal(entry.auth, true);
  });

  it('"switch-list" entry: GET /admin/api-switch/list?pageNum=1&pageSize=10, auth=true', () => {
    const entry = flat.find((e) => e.key === 'switch-list');
    assert.ok(entry, 'switch-list entry must exist');
    assert.equal(entry.method, 'GET');
    assert.equal(entry.path, '/admin/api-switch/list?pageNum=1&pageSize=10');
    assert.equal(entry.auth, true);
  });

  it('"rate-limit" entry: GET /admin/rate-limit/status, auth=true', () => {
    const entry = flat.find((e) => e.key === 'rate-limit');
    assert.ok(entry, 'rate-limit entry must exist');
    assert.equal(entry.method, 'GET');
    assert.equal(entry.path, '/admin/rate-limit/status');
    assert.equal(entry.auth, true);
  });

  // ── Structural: every item has required fields ──

  it('every item has key, name, method, path, auth fields', () => {
    for (const item of flat) {
      assert.ok(typeof item.key === 'string' && item.key.length > 0, `item missing valid key: ${JSON.stringify(item)}`);
      assert.ok(typeof item.name === 'string', `item ${item.key} missing name`);
      assert.ok(typeof item.method === 'string', `item ${item.key} missing method`);
      assert.ok(typeof item.path === 'string', `item ${item.key} missing path`);
      assert.ok(typeof item.auth === 'boolean', `item ${item.key} missing auth boolean`);
    }
  });
});

describe('B20: resourceGroups.js — global uniqueness + group assignment', () => {
  const allResources = Object.values(RESOURCE_GROUPS).flatMap((g) => g.resources);

  it('all resources across groups are globally unique — known gap: aiDetectRecord in both agri & ai', () => {
    // 2026-08-11: aiDetectRecord appears in both agri and ai groups (pre-existing).
    // This test locks current behavior; fixing the duplicate is a follow-up task.
    const knownDuplicates = new Set(['aiDetectRecord']);
    const unique = new Set(allResources);
    const filtered = allResources.filter((r) => !knownDuplicates.has(r));
    const uniqueFiltered = new Set(filtered);
    const diff = filtered.length - uniqueFiltered.size;
    if (diff > 0) {
      const seen = new Set();
      const dups = new Set();
      for (const r of filtered) {
        if (seen.has(r)) dups.add(r);
        seen.add(r);
      }
      assert.equal(diff, 0, `unexpected duplicate resource keys: ${[...dups].join(', ')}`);
    }
    // Explicitly confirm the known duplicate exists in both groups
    assert.ok(RESOURCE_GROUPS.agri.resources.includes('aiDetectRecord'),
      'known: aiDetectRecord in agri group');
    assert.ok(RESOURCE_GROUPS.ai.resources.includes('aiDetectRecord'),
      'known: aiDetectRecord in ai group');
  });

  it('"order" resource is in the market group', () => {
    assert.ok(
      RESOURCE_GROUPS.market.resources.includes('order'),
      'order should be in market group resources',
    );
  });

  it('"aiQaRecord" resource is in the ai group', () => {
    assert.ok(
      RESOURCE_GROUPS.ai.resources.includes('aiQaRecord'),
      'aiQaRecord should be in ai group resources',
    );
  });

  it('"statReport" resource is in the data group', () => {
    assert.ok(
      RESOURCE_GROUPS.data.resources.includes('statReport'),
      'statReport should be in data group resources',
    );
  });

  it('every group has title and resources array', () => {
    for (const [key, group] of Object.entries(RESOURCE_GROUPS)) {
      assert.ok(typeof group.title === 'string', `group ${key} missing title`);
      assert.ok(Array.isArray(group.resources), `group ${key} resources is not an array`);
    }
  });
});
