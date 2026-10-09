import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { createAdminFixture } from "./admin-fixtures";

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  const setup = new Client({
    connectionString:
      process.env.ADMIN_TEST_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54342/postgres",
  });
  await setup.connect();
  await setup.query("UPDATE private.admin_console_settings SET stage='inspection' WHERE singleton");
  await setup.end();
});

const BARRIER = 777001;

function dbUrl(): string {
  const raw =
    process.env.ADMIN_TEST_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54342/postgres";
  const parsed = new URL(raw);
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error("Concurrency specs refuse non-loopback databases.");
  }
  return raw;
}

async function claimAs(client: Client, userId: string, aal: string): Promise<void> {
  await client.query("BEGIN");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [userId]);
  await client.query("SELECT set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: userId, aal, role: "authenticated", user_metadata: { role: "owner" } }),
  ]);
  await client.query("SET LOCAL ROLE authenticated");
}

async function lockHeld(): Promise<boolean> {
  const probe = new Client({ connectionString: dbUrl() });
  await probe.connect();
  try {
    const res = await probe.query(
      "SELECT count(*)::int AS n FROM pg_locks WHERE locktype = 'advisory' AND objid = $1 AND granted",
      [BARRIER]
    );
    return res.rows[0].n > 0;
  } finally {
    await probe.end();
  }
}

test("simultaneous starts serialize to one head", async () => {
  const fixture = await createAdminFixture("concurrency-start", ["owner"], "editing");
  try {
    const recipeId = fixture.recipeId;
    const userId = fixture.userId;

    const clientA = new Client({ connectionString: dbUrl() });
    const clientB = new Client({ connectionString: dbUrl() });
    await clientA.connect();
    await clientB.connect();
    try {
      await claimAs(clientA, userId, "aal2");
      await claimAs(clientB, userId, "aal2");
      await clientA.query("SELECT pg_advisory_xact_lock($1)", [BARRIER]);
      expect(await lockHeld()).toBe(true);

      const taskB = (async () => {
        await clientB.query("SELECT pg_advisory_xact_lock($1)", [BARRIER]);
        return clientB.query("SELECT public.admin_draft_start($1, gen_random_uuid()) AS receipt", [
          recipeId,
        ]);
      })();
      // B cannot reach the start until A releases the barrier; confirm it is
      // still waiting rather than racing ahead.
      await new Promise((resolve) => setTimeout(resolve, 800));
      expect(await lockHeld()).toBe(true);

      const receiptA = await clientA.query(
        "SELECT public.admin_draft_start($1, $2) AS receipt",
        [recipeId, "93000000-0000-0000-0000-000000000201"]
      );
      await clientA.query("COMMIT");
      const receiptB = await taskB;
      await clientB.query("COMMIT");

      expect(receiptA.rows[0].receipt.draftId).toBe(receiptB.rows[0].receipt.draftId);
    } finally {
      await clientA.end().catch(() => {});
      await clientB.end().catch(() => {});
    }
  } finally {
    await fixture.dispose();
  }
});

test("simultaneous saves admit one winner and one conflict", async () => {
  const fixture = await createAdminFixture("concurrency-save", ["owner"], "editing");
  try {
    const recipeId = fixture.recipeId;
    const userId = fixture.userId;

    const setup = new Client({ connectionString: dbUrl() });
    await setup.connect();
    try {
      await claimAs(setup, userId, "aal2");
      await setup.query("SELECT public.admin_draft_start($1, gen_random_uuid())", [recipeId]);
      await setup.query("COMMIT");
    } finally {
      await setup.end();
    }

    const buildCommand = async (title: string, op: string): Promise<Record<string, unknown>> => {
      const reader = new Client({ connectionString: dbUrl() });
      await reader.connect();
      try {
        const head = await reader.query(
          `SELECT working_version, base_content_version, base_active_hash, current_revision_id
           FROM private.recipe_drafts WHERE recipe_id = $1 AND workflow_schema = 1`,
          [recipeId]
        );
        const row = head.rows[0];
        const rev = await reader.query("SELECT private.admin_revision_json($1) AS r", [
          row.current_revision_id,
        ]);
        const snapshot = rev.rows[0].r.snapshot;
        snapshot.catalog = { ...snapshot.catalog, title };
        return {
          operation_id: op,
          recipe_id: recipeId,
          reason: "concurrency race",
          expected_version: row.working_version,
          expected_digest: rev.rows[0].r.digest,
          base: {
            content_version: row.base_content_version,
            active_hash: row.base_active_hash,
          },
          snapshot,
          reopen_reviewed: false,
        };
      } finally {
        await reader.end();
      }
    };

    const cmdA = await buildCommand("Winner title", "93000000-0000-0000-0000-000000000202");
    const cmdB = await buildCommand("Loser title", "93000000-0000-0000-0000-000000000203");

    const clientA = new Client({ connectionString: dbUrl() });
    const clientB = new Client({ connectionString: dbUrl() });
    await clientA.connect();
    await clientB.connect();
    try {
      await claimAs(clientA, userId, "aal2");
      await claimAs(clientB, userId, "aal2");
      await clientA.query("SELECT pg_advisory_xact_lock($1)", [BARRIER]);
      const taskB = (async () => {
        await clientB.query("SELECT pg_advisory_xact_lock($1)", [BARRIER]);
        return clientB.query("SELECT public.admin_draft_save($1) AS receipt", [
          JSON.stringify(cmdB),
        ]);
      })();
      await new Promise((resolve) => setTimeout(resolve, 800));
      expect(await lockHeld()).toBe(true);

      const receiptA = await clientA.query("SELECT public.admin_draft_save($1) AS receipt", [
        JSON.stringify(cmdA),
      ]);
      await clientA.query("COMMIT");

      let conflict: { code?: string; message?: string } | null = null;
      try {
        await taskB;
        await clientB.query("COMMIT");
      } catch (error) {
        conflict = error as { code?: string; message?: string };
        await clientB.query("ROLLBACK").catch(() => {});
      }
      expect(receiptA.rows[0].receipt.version).toBe(2);
      expect(conflict?.code ?? "").toBe("PT409");
      expect(conflict?.message ?? "").toContain("ADM_CONFLICT");
    } finally {
      await clientA.end().catch(() => {});
      await clientB.end().catch(() => {});
    }

    const check = new Client({ connectionString: dbUrl() });
    await check.connect();
    try {
      const res = await check.query(
        `SELECT working_version, (SELECT count(*)::int FROM private.recipe_revisions r
          JOIN private.recipe_drafts d ON d.id = r.draft_id
          WHERE d.recipe_id = $1 AND d.workflow_schema = 1) AS revisions
         FROM private.recipe_drafts WHERE recipe_id = $1 AND workflow_schema = 1`,
        [recipeId]
      );
      expect(res.rows[0].working_version).toBe(2);
      expect(res.rows[0].revisions).toBe(2);
    } finally {
      await check.end();
    }
  } finally {
    await fixture.dispose();
  }
});
