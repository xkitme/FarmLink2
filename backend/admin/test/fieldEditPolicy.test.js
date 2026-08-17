// 116g-B 字段元数据消费策略（纯函数强测试）
// 覆盖工作单强测试 9：readonly / createOnly / required 的创建/编辑差异。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  FORM_MODE,
  editableFormFields,
  isFieldEditable,
  isFieldRequired,
  isFieldVisible,
  normalizeInitial,
} from '../src/policies/fieldEditPolicy.js';

describe('isFieldVisible — createOnly / readonly 的创建/编辑差异（强测试 9）', () => {
  it('createOnly：创建可见可编辑；编辑隐藏', () => {
    const field = { name: 'password', label: '初始密码', type: 'password', createOnly: true };
    assert.equal(isFieldVisible(field, FORM_MODE.CREATE), true);
    assert.equal(isFieldVisible(field, FORM_MODE.EDIT), false);
    assert.equal(isFieldEditable(field, FORM_MODE.CREATE), true);
    assert.equal(isFieldEditable(field, FORM_MODE.EDIT), false);
  });

  it('readonly：创建隐藏（服务端指派）；编辑可见但禁用（只读呈现）', () => {
    const field = { name: 'createdAt', label: '创建时间', type: 'date', readonly: true };
    assert.equal(isFieldVisible(field, FORM_MODE.CREATE), false);
    assert.equal(isFieldVisible(field, FORM_MODE.EDIT), true);
    assert.equal(isFieldEditable(field, FORM_MODE.CREATE), false);
    assert.equal(isFieldEditable(field, FORM_MODE.EDIT), false, 'readonly must stay disabled in edit');
  });

  it('普通字段：两种模式均可见可编辑', () => {
    const field = { name: 'title', label: '标题', type: 'string' };
    assert.equal(isFieldVisible(field, FORM_MODE.CREATE), true);
    assert.equal(isFieldVisible(field, FORM_MODE.EDIT), true);
    assert.equal(isFieldEditable(field, FORM_MODE.CREATE), true);
    assert.equal(isFieldEditable(field, FORM_MODE.EDIT), true);
  });

  it('空字段/非法字段 → 不可见不可编辑（防御）', () => {
    assert.equal(isFieldVisible(null, FORM_MODE.EDIT), false);
    assert.equal(isFieldEditable(undefined, FORM_MODE.CREATE), false);
  });

  it('createOnly + required：创建模式必填成立；编辑模式隐藏但 required 元数据仍为 true', () => {
    const field = { name: 'password', label: '初始密码', type: 'password', createOnly: true, required: true };
    assert.equal(isFieldRequired(field), true);
    assert.equal(isFieldVisible(field, FORM_MODE.CREATE), true);
    assert.equal(isFieldVisible(field, FORM_MODE.EDIT), false);
  });
});

describe('isFieldRequired — required 元数据直映射', () => {
  it('required:true → true；缺省/false → false', () => {
    assert.equal(isFieldRequired({ name: 'a', required: true }), true);
    assert.equal(isFieldRequired({ name: 'a', required: false }), false);
    assert.equal(isFieldRequired({ name: 'a' }), false);
    assert.equal(isFieldRequired(null), false);
  });
});

describe('editableFormFields — 按模式过滤（不推断领域状态）', () => {
  it('编辑模式排除 createOnly、保留 readonly；创建模式排除 readonly、保留 createOnly', () => {
    const fields = [
      { name: 'password', createOnly: true },
      { name: 'createdAt', readonly: true },
      { name: 'title' },
    ];
    assert.deepEqual(
      editableFormFields(fields, FORM_MODE.EDIT).map((f) => f.name),
      ['createdAt', 'title'],
    );
    assert.deepEqual(
      editableFormFields(fields, FORM_MODE.CREATE).map((f) => f.name),
      ['password', 'title'],
    );
  });

  it('未声明元数据的字段一律保留（不猜测、不镜像领域状态机）', () => {
    const fields = [{ name: 'status' }, { name: 'remark' }];
    assert.deepEqual(editableFormFields(fields, FORM_MODE.EDIT), fields);
    assert.deepEqual(editableFormFields(fields, FORM_MODE.CREATE), fields);
  });
});

describe('normalizeInitial — 编辑初始值只取可见字段', () => {
  const fields = [
    { name: 'username', label: '用户名' },
    { name: 'password', label: '初始密码', type: 'password', createOnly: true },
    { name: 'createdAt', label: '创建时间', type: 'date', readonly: true },
    { name: 'role', label: '角色' },
  ];

  it('编辑模式：排除 createOnly，保留 readonly，date 截断为 YYYY-MM-DD', () => {
    const values = normalizeInitial(
      { username: 'a', password: 'secret', createdAt: '2026-08-17T08:00:00.000Z', role: 'ADMIN' },
      fields,
      FORM_MODE.EDIT,
    );
    assert.deepEqual(values, {
      username: 'a',
      createdAt: '2026-08-17',
      role: 'ADMIN',
    });
    assert.equal('password' in values, false, 'createOnly must not enter edit initial values');
  });

  it('创建模式（防御口径）：createOnly 可见、readonly 隐藏', () => {
    const values = normalizeInitial(
      { username: 'a', password: 'x', createdAt: '2026-08-17T08:00:00.000Z', role: 'ADMIN' },
      fields,
      FORM_MODE.CREATE,
    );
    assert.deepEqual(values, { username: 'a', password: 'x', role: 'ADMIN' });
    assert.equal('createdAt' in values, false);
  });

  it('缺失值原样保留为 undefined（表单由 Form 组件管理）', () => {
    const values = normalizeInitial({ username: 'a' }, fields, FORM_MODE.EDIT);
    assert.equal(values.username, 'a');
    assert.equal('role' in values, true);
    assert.equal(values.role, undefined);
  });
});
