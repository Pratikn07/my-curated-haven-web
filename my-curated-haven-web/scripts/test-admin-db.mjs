import { readFileSync, writeFileSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
let workdir = root;
if (args[0] === '--workdir') { args.shift(); workdir = resolve(root, args.shift()); }
if (args.some(a => a.startsWith('-'))) throw new Error('Only local workdir and SQL filenames are accepted');
const config = readFileSync(resolve(workdir, 'supabase/config.toml'), 'utf8');
if (!/^project_id\s*=\s*"(?:my-curated-haven-impl|mch-admin-recipe-test)"/m.test(config)) throw new Error('Unrecognized local test project');
const fixture = readFileSync(resolve(root, 'supabase/test-fixtures/admin-console.sql'), 'utf8');
const testsDir = resolve(root, 'supabase/tests/database');
const files = args.length ? args : readdirSync(testsDir).filter(f => /^(?:1[0-6]|59|60)_.*admin.*\.test\.sql$/.test(f));
if (!files.length) throw new Error('No admin SQL tests selected');
const scratch = mkdtempSync(resolve(tmpdir(), 'mch-admin-pgtap-'));
try {
 const bundled = files.map(file => {
  if (!/^[\w.-]+\.sql$/.test(file)) throw new Error('Expected a SQL filename');
  const source = readFileSync(resolve(testsDir, file), 'utf8');
  const content = source.replaceAll('\\ir ../../test-fixtures/admin-console.sql', () => fixture);
  if (/^\\(?:i|ir)\s/m.test(content)) throw new Error('Unresolved SQL include');
  const target = resolve(scratch, basename(file)); writeFileSync(target, content); return target;
 });
 const result = spawnSync('supabase', ['test', 'db', '--local', '--workdir', workdir, ...bundled], { stdio: 'inherit' });
 if (result.error) throw result.error;
 process.exitCode = result.status ?? 1;
 if (result.status === 0) console.log('ADMIN_DATABASE_PASSED');
} finally { rmSync(scratch, { recursive: true, force: true }); }
