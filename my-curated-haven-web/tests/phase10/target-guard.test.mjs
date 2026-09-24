import test from "node:test";
import assert from "node:assert/strict";
import { validatePhase10Targets } from "../../scripts/phase10-target-guard.mjs";

const localTargets = {
  PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3000",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  COMMERCE_DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
};

test("local loopback app and database targets are allowed by default", () => {
  assert.deepEqual(validatePhase10Targets({}), {
    appOrigin: "http://127.0.0.1:3000",
    supabaseOrigin: "http://127.0.0.1:54321",
    remoteTargets: [],
  });
});

test("an explicitly production target is refused even when URLs are local", () => {
  assert.throws(
    () =>
      validatePhase10Targets({
        ...localTargets,
        PHASE10_TARGET_ENVIRONMENT: "production",
      }),
    /refuse production targets/i,
  );
});

test("a remote target requires an explicit nonproduction environment", () => {
  assert.throws(
    () =>
      validatePhase10Targets({
        ...localTargets,
        PLAYWRIGHT_BASE_URL: "https://qa.example.test",
        PHASE10_ALLOWED_PLAYWRIGHT_ORIGINS: "https://qa.example.test",
      }),
    /PHASE10_TARGET_ENVIRONMENT/i,
  );
});

test("a staging target requires exact app and database origin allowlists", () => {
  assert.throws(
    () =>
      validatePhase10Targets({
        ...localTargets,
        PHASE10_TARGET_ENVIRONMENT: "staging",
        PLAYWRIGHT_BASE_URL: "https://qa.example.test",
      }),
    /explicitly allowlisted/i,
  );
});

test("an exact staging allowlist accepts explicitly named remote origins", () => {
  assert.deepEqual(
    validatePhase10Targets({
      PHASE10_TARGET_ENVIRONMENT: "staging",
      PLAYWRIGHT_BASE_URL: "https://qa.example.test",
      NEXT_PUBLIC_SUPABASE_URL: "https://db.example.test",
      PHASE10_ALLOWED_PLAYWRIGHT_ORIGINS: "https://qa.example.test",
      PHASE10_ALLOWED_SUPABASE_ORIGINS: "https://db.example.test",
    }),
    {
      appOrigin: "https://qa.example.test",
      supabaseOrigin: "https://db.example.test",
      remoteTargets: ["playwright", "supabase"],
    },
  );
});

test("an allowlisted app does not implicitly allow a different Supabase origin", () => {
  assert.throws(
    () =>
      validatePhase10Targets({
        PHASE10_TARGET_ENVIRONMENT: "preview",
        PLAYWRIGHT_BASE_URL: "https://qa.example.test",
        NEXT_PUBLIC_SUPABASE_URL: "https://unexpected.example.test",
        PHASE10_ALLOWED_PLAYWRIGHT_ORIGINS: "https://qa.example.test",
      }),
    /supabase target.*explicitly allowlisted/i,
  );
});

test("a remote direct database URL requires a nonproduction target and exact host-port allowlist", () => {
  const remoteDatabase = "postgresql://postgres:private-fixture@db.example.test:6543/postgres";
  assert.throws(
    () => validatePhase10Targets({ COMMERCE_DATABASE_URL: remoteDatabase }),
    /PHASE10_TARGET_ENVIRONMENT/i,
  );
  let error;
  assert.throws(() => {
    try {
      validatePhase10Targets({
        PHASE10_TARGET_ENVIRONMENT: "staging",
        COMMERCE_DATABASE_URL: remoteDatabase,
      });
    } catch (caught) {
      error = caught;
      throw caught;
    }
  }, /database target.*explicitly allowlisted/i);
  assert.doesNotMatch(error.message, /private-fixture/);
  assert.deepEqual(
    validatePhase10Targets({
      PHASE10_TARGET_ENVIRONMENT: "staging",
      COMMERCE_DATABASE_URL: remoteDatabase,
        PHASE10_ALLOWED_DATABASE_TARGETS: "db.example.test:6543/postgres",
    }).remoteTargets,
    ["database"],
  );
});

test("every configured direct database URL is checked", () => {
  assert.throws(
    () =>
      validatePhase10Targets({
        ...localTargets,
        PHASE10_TARGET_ENVIRONMENT: "staging",
        DATABASE_URL:
          "postgresql://postgres:private-fixture@db.other.example.test:5432/postgres",
      }),
    /database target.*explicitly allowlisted/i,
  );
});

test("known production app and database origins are refused even when mislabeled as staging", () => {
  assert.throws(
    () =>
      validatePhase10Targets({
        PHASE10_TARGET_ENVIRONMENT: "staging",
        PLAYWRIGHT_BASE_URL: "https://www.mycuratedhaven.com",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        PHASE10_ALLOWED_PLAYWRIGHT_ORIGINS: "https://www.mycuratedhaven.com",
      }),
    /known production origin/i,
  );
  assert.throws(
    () =>
      validatePhase10Targets({
        PHASE10_TARGET_ENVIRONMENT: "staging",
        PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3000",
        NEXT_PUBLIC_SUPABASE_URL: "https://ccrgvammglkvdlaojgzv.supabase.co",
        PHASE10_ALLOWED_SUPABASE_ORIGINS: "https://ccrgvammglkvdlaojgzv.supabase.co",
      }),
    /known production origin/i,
  );
  assert.throws(
    () =>
      validatePhase10Targets({
        PHASE10_TARGET_ENVIRONMENT: "staging",
        COMMERCE_DATABASE_URL:
          "postgresql://postgres:private-fixture@db.ccrgvammglkvdlaojgzv.supabase.co:5432/postgres",
        PHASE10_ALLOWED_DATABASE_TARGETS:
          "db.ccrgvammglkvdlaojgzv.supabase.co:5432/postgres",
      }),
    /known production origin/i,
  );
});

test("malformed URLs, credentials, and origins with paths are refused", () => {
  assert.throws(
    () =>
      validatePhase10Targets({
        ...localTargets,
        PLAYWRIGHT_BASE_URL: "https://user:secret@qa.example.test",
        PHASE10_TARGET_ENVIRONMENT: "staging",
        PHASE10_ALLOWED_PLAYWRIGHT_ORIGINS: "https://qa.example.test",
      }),
    /credentials/i,
  );
  assert.throws(
    () =>
      validatePhase10Targets({
        ...localTargets,
        PHASE10_TARGET_ENVIRONMENT: "staging",
        PLAYWRIGHT_BASE_URL: "https://qa.example.test/path",
        PHASE10_ALLOWED_PLAYWRIGHT_ORIGINS: "https://qa.example.test/path",
      }),
    /origin only/i,
  );
});
