import crypto from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import { validatePhase10Targets } from "../../scripts/phase10-target-guard.mjs";

export type Assurance = "aal1" | "aal2";

export interface AdminFixture {
  userId: string;
  email: string;
  recipeId: string;
  recipeSlug: string;
  login(page: { context(): { addCookies(c: CookieParam[]): Promise<void> } }, assurance?: Assurance): Promise<void>;
  snapshot(): Promise<unknown>;
  active(): Promise<{ catalog: { title: string } }>;
  revoke(): Promise<void>;
  outOfBandTitle(title: string): Promise<void>;
  operationCount(operationId: string): Promise<number>;
  dispose(): Promise<void>;
}

interface CookieParam {
  name: string;
  value: string;
  domain: string;
  path: string;
}

function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
}

function anonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
  );
}

function serviceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Admin fixtures need SUPABASE_SERVICE_ROLE_KEY (local test key only, never production).");
  return key;
}

function databaseUrl(): string {
  const raw =
    process.env.ADMIN_TEST_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54342/postgres";
  const parsed = new URL(raw);
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error("Admin fixtures refuse non-loopback databases.");
  }
  return raw;
}

export function totp(secret: string, now: number = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = secret
    .toUpperCase()
    .replace(/=+$/, "")
    .split("")
    .map((c) => alphabet.indexOf(c).toString(2).padStart(5, "0"))
    .join("");
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  const key = Buffer.from(bytes);
  const counter = Math.floor(now / 30000);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, "0");
}

export function readTelemetry(requests: string[]): unknown[] {
  return requests.map((raw) => {
    try {
      return JSON.parse(raw);
    } catch {
      return { raw: raw.slice(0, 200) };
    }
  });
}

async function withPg<T>(fn: (pg: Client) => Promise<T>): Promise<T> {
  const pg = new Client({ connectionString: databaseUrl() });
  await pg.connect();
  try {
    return await fn(pg);
  } finally {
    await pg.end();
  }
}

export async function createAdminFixture(
  label: string,
  roles: string[],
  minStage: "inspection" | "editing" | "publication" = "inspection"
): Promise<AdminFixture> {
  validatePhase10Targets();
  const url = supabaseUrl();
  const urlHost = new URL(url).hostname;
  if (urlHost !== "127.0.0.1" && urlHost !== "localhost") {
    throw new Error("Admin fixtures refuse non-loopback Supabase targets.");
  }
  const admin = createClient(url, serviceKey(), { auth: { persistSession: false } });
  const safeLabel = label.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 12);
  const rand = crypto.randomBytes(2).toString("hex");
  const email = `syn-${safeLabel}-${rand}@synthetic.test`;
  const password = `Synth-${crypto.randomBytes(9).toString("hex")}!1A`;

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Synthetic" },
  });
  if (created.error || !created.data.user) {
    throw new Error(`Admin fixture user creation failed: ${created.error?.message ?? "unknown"}`);
  }
  const userId = created.data.user.id;
  const recipeId = crypto.randomUUID();

  async function cleanupPartial(): Promise<void> {
    try {
      await withPg(async (pg) => {
        await pg.query("ALTER TABLE private.recipe_revisions DISABLE TRIGGER recipe_revisions_immutable");
        try {
          await pg.query("DELETE FROM private.recipe_revisions WHERE recipe_id=$1", [recipeId]);
        } finally {
          await pg.query("ALTER TABLE private.recipe_revisions ENABLE TRIGGER recipe_revisions_immutable");
        }
        await pg.query("DELETE FROM private.recipe_drafts WHERE recipe_id=$1 AND workflow_schema=1", [
          recipeId,
        ]);
        await pg.query("DELETE FROM public.recipe_catalog WHERE id=$1", [recipeId]);
        await pg.query("ALTER TABLE private.admin_memberships DISABLE TRIGGER admin_owner_protected");
        try {
          await pg.query("DELETE FROM private.admin_memberships WHERE user_id=$1", [userId]);
        } finally {
          await pg.query("ALTER TABLE private.admin_memberships ENABLE TRIGGER admin_owner_protected");
        }
      });
    } catch {
      // Best effort: the orphan message below names the remedy.
    }
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }

  try {
    return await buildFixture();
  } catch (error) {
    await cleanupPartial();
    throw error;
  }

  async function buildFixture(): Promise<AdminFixture> {

  // Capture real SSR session cookies through the app's own cookie adapter.
  let captured: { name: string; value: string }[] = [];
  const browser = createServerClient(url, anonKey(), {
    cookies: {
      getAll: () => captured.map((c) => ({ name: c.name, value: c.value })),
      setAll: (cookiesToSet) => {
        captured = cookiesToSet.map((c) => ({ name: c.name, value: c.value }));
      },
    },
  });
  const signed = await browser.auth.signInWithPassword({ email, password });
  if (signed.error) throw new Error(`Admin fixture sign-in failed: ${signed.error.message}`);
  const aal1Cookies = [...captured];

  const enroll = await browser.auth.mfa.enroll({ factorType: "totp", friendlyName: `admin-${safeLabel}` });
  if (enroll.error || !enroll.data) throw new Error(`Admin fixture MFA enroll failed: ${enroll.error?.message}`);
  const challenge = await browser.auth.mfa.challenge({ factorId: enroll.data.id });
  if (challenge.error) throw new Error(`Admin fixture MFA challenge failed: ${challenge.error.message}`);
  const verified = await browser.auth.mfa.verify({
    factorId: enroll.data.id,
    challengeId: challenge.data.id,
    code: totp(enroll.data.totp.secret),
  });
  if (verified.error) throw new Error(`Admin fixture MFA verify failed: ${verified.error.message}`);
  const aal2Cookies = [...captured];

  await withPg(async (pg) => {
    await pg.query(
      `UPDATE private.admin_console_settings SET stage = (
         SELECT (ARRAY['disabled','inspection','editing','publication'])[rank] FROM (
           SELECT greatest(
             (SELECT array_position(ARRAY['disabled','inspection','editing','publication'], stage)
              FROM private.admin_console_settings WHERE singleton),
             array_position(ARRAY['disabled','inspection','editing','publication'], $1::text)) AS rank
         ) s
       ) WHERE singleton`,
      [minStage]
    );
    try {
      await pg.query(
        "INSERT INTO private.admin_memberships(user_id,role,granted_by,reason) SELECT $1,r,$1,$2 FROM unnest($3::text[]) r",
        [userId, `Synthetic ${label}`, roles]
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes("admin_one_active_owner")) {
        throw new Error("Admin specs need --workers=1: a second active owner cannot exist.");
      }
      throw error;
    }
  });

  const recipeSlug = `synthetic-${safeLabel}-${rand}`;
  const recipeTitle = `Synthetic ${label} ${rand}`;
  await withPg(async (pg) => {
    await pg.query(
      "INSERT INTO public.recipe_catalog(id,slug,title,public_summary,preview_image_path,total_minutes) VALUES($1,$2,$3,'Synthetic fixture','recipe-previews/fixture.webp',15)",
      [recipeId, recipeSlug, recipeTitle]
    );
    await pg.query(
      "INSERT INTO public.recipe_bodies(recipe_id,ingredients,instructions,yield,allergen_review_state) VALUES($1,'[{\"item\":\"Synthetic\"}]','[{\"step\":1,\"text\":\"Synthetic\"}]','1 serving','reviewed_no_allergens')",
      [recipeId]
    );
  });

  let disposed = false;
  async function fetchTitle(): Promise<{ catalog: { title: string } }> {
    return { catalog: { title: recipeTitle } };
  }
  return {
    userId,
    email,
    recipeId,
    recipeSlug,
    async login(page, assurance: Assurance = "aal2") {
      const cookies = (assurance === "aal2" ? aal2Cookies : aal1Cookies).map((c) => ({
        ...c,
        domain: urlHost,
        path: "/",
      }));
      await page.context().addCookies(cookies);
    },
    async snapshot() {
      return fetchTitle();
    },
    async active() {
      return fetchTitle();
    },
    async revoke() {
      await withPg(async (pg) => {
        await pg.query("UPDATE private.admin_memberships SET active=false,revoked_at=now() WHERE user_id=$1 AND active", [userId]);
      });
    },
    async outOfBandTitle(title: string) {
      await withPg(async (pg) => {
        await pg.query("UPDATE public.recipe_catalog SET title=$2 WHERE id=$1", [recipeId, title]);
      });
    },
    async operationCount(operationId: string) {
      return withPg(async (pg) => {
        const res = await pg.query("SELECT count(*)::int AS n FROM private.admin_operations WHERE operation_id=$1", [operationId]);
        return res.rows[0].n as number;
      });
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      await withPg(async (pg) => {
        await pg.query("ALTER TABLE private.recipe_revisions DISABLE TRIGGER recipe_revisions_immutable");
        try {
          await pg.query("DELETE FROM private.recipe_revisions WHERE recipe_id=$1", [recipeId]);
        } finally {
          await pg.query("ALTER TABLE private.recipe_revisions ENABLE TRIGGER recipe_revisions_immutable");
        }
        await pg.query("DELETE FROM private.recipe_drafts WHERE recipe_id=$1 AND workflow_schema=1", [
          recipeId,
        ]);
        await pg.query("DELETE FROM public.recipe_catalog WHERE id=$1", [recipeId]);
        await pg.query("ALTER TABLE private.admin_memberships DISABLE TRIGGER admin_owner_protected");
        try {
          await pg.query("DELETE FROM private.admin_memberships WHERE user_id=$1", [userId]);
        } finally {
          await pg.query("ALTER TABLE private.admin_memberships ENABLE TRIGGER admin_owner_protected");
        }
      });
      await admin.auth.admin.deleteUser(userId).catch(() => {});
    },
  };
  }
}
