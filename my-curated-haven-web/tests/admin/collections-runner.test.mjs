import test from 'node:test';
import assert from 'node:assert/strict';
import { selectAdminSql } from '../../scripts/test-admin-db.mjs';

test('default selection includes recipe publication and collection suites', () => {
  assert.deepEqual(selectAdminSql([
    '16_admin_recipe_publication.test.sql',
    '17_admin_collections_access.test.sql',
    '03_commerce.test.sql',
  ]), [
    '16_admin_recipe_publication.test.sql',
    '17_admin_collections_access.test.sql',
  ]);
});

test('default selection keeps every suite that CI routes to this runner', () => {
  assert.deepEqual(selectAdminSql([
    '09_recipe_review_log.test.sql',
    '10_recipe_admin_access.test.sql',
    '60_admin_recipe_history_page.test.sql',
  ]), [
    '10_recipe_admin_access.test.sql',
    '60_admin_recipe_history_page.test.sql',
  ]);
});

test('--all selects other database suites but rejects unsafe filenames', () => {
  assert.deepEqual(selectAdminSql([
    '03_commerce.test.sql',
    '../99_admin_escape.test.sql',
    '17_admin_collections_access.test.sql',
  ], true), [
    '03_commerce.test.sql',
    '17_admin_collections_access.test.sql',
  ]);
});
