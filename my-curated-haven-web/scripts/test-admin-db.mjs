import { readFileSync, writeFileSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { dirname, resolve, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const testsDir = resolve(root, 'supabase/tests/database');
const fixturePaths = ['admin-console.sql', 'admin-collections.sql'];

export function selectAdminSql(names, all = false) {
  // Matches web-ci.yml, which excludes every `*admin*` suite from the plain pgTAP run.
  const allowed = all ? /^\d+_[\w-]+\.test\.sql$/ : /^\d+_[\w-]*admin[\w-]*\.test\.sql$/;
  return names.filter((name) => allowed.test(name)).sort();
}

function parseArgs(args) {
  let workdir = root;
  let all = false;
  const files = [];
  while (args.length) {
    const arg = args.shift();
    if (arg === '--workdir') {
      if (!args.length) throw new Error('--workdir requires a local directory');
      workdir = resolve(root, args.shift());
    } else if (arg === '--all') {
      all = true;
    } else if (/^\d+_[\w-]+\.test\.sql$/.test(arg)) {
      files.push(arg);
    } else {
      throw new Error('Only local workdir, --all and safe SQL filenames are accepted');
    }
  }
  if (all && files.length) throw new Error('--all cannot be combined with explicit SQL filenames');
  const withinRoot = relative(root, workdir);
  if (withinRoot.startsWith('..') || withinRoot.startsWith('/')) throw new Error('Test workdir must be inside this repository');
  return { workdir, all, files };
}

function run() {
  const { workdir, all, files: explicitFiles } = parseArgs(process.argv.slice(2));
  const config = readFileSync(resolve(workdir, 'supabase/config.toml'), 'utf8');
  if (!/^project_id\s*=\s*"(?:my-curated-haven-impl|mch-admin-recipe-test|mch-admin-collections-test)"/m.test(config)) {
    throw new Error('Unrecognized local test project');
  }
  const files = explicitFiles.length ? explicitFiles : selectAdminSql(readdirSync(testsDir), all);
  if (!files.length) throw new Error('No SQL tests selected');
  const scratch = mkdtempSync(resolve(tmpdir(), 'mch-admin-pgtap-'));
  try {
    const bundled = files.map((file) => {
      const source = readFileSync(resolve(testsDir, file), 'utf8');
      let content = source;
      for (const name of fixturePaths) {
        const include = `\\ir ../../test-fixtures/${name}`;
        if (content.includes(include)) {
          const fixture = readFileSync(resolve(root, 'supabase/test-fixtures', name), 'utf8');
          content = content.replaceAll(include, () => fixture);
        }
      }
      if (/^\\(?:i|ir)\s/m.test(content)) throw new Error(`Unresolved SQL include in ${file}`);
      const target = resolve(scratch, basename(file));
      writeFileSync(target, content);
      return target;
    });
    const result = spawnSync('supabase', ['test', 'db', '--local', '--workdir', workdir, ...bundled], { stdio: 'inherit' });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
    if (result.status === 0) console.log('ADMIN_DATABASE_PASSED');
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
