import test from 'node:test';
import assert from 'node:assert/strict';
import { selectAdminSql, bundleAdminSql } from '../../scripts/test-admin-db.mjs';

test('support suites are selected without selecting arbitrary paths', () => {
  assert.deepEqual(selectAdminSql(['70_admin_support_access.test.sql', '../../secret.sql']),
    ['70_admin_support_access.test.sql']);
});

test('known support fixtures bundle but an unknown include is refused', () => {
  const fixtures = new Map([['../../test-fixtures/admin-support.sql', 'select 1;']]);
  assert.equal(bundleAdminSql('\\ir ../../test-fixtures/admin-support.sql', fixtures), 'select 1;');
  assert.throws(() => bundleAdminSql('\\ir ../../unknown.sql', fixtures), /Unresolved SQL include/);
  assert.throws(() => bundleAdminSql('\\i /etc/passwd', fixtures), /Unresolved SQL include/);
});

test('a fixture is inserted literally, never as a replacement pattern', () => {
  const fixtures = new Map([['../../test-fixtures/admin-support.sql', "select '$&';"]]);
  assert.equal(bundleAdminSql('\\ir ../../test-fixtures/admin-support.sql', fixtures), "select '$&';");
});
