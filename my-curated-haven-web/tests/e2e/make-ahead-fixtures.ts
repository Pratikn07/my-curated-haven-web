import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

/**
 * A Halloween buyer and a signed-in stranger for the make-ahead plan specs, on a loopback stack only. When the
 * database has no Halloween book it gets a synthetic one (one release, an enabled test offer). The plan row is the
 * invented fixture in tests/fixtures/make-ahead-plan.fixture.json, never the real plan. Removes what it created and
 * puts back any plan row it replaced.
 */

export const FIXTURE_PLAN = JSON.parse(
  readFileSync(join(__dirname, "../fixtures/make-ahead-plan.fixture.json"), "utf8")
) as Record<string, unknown>;

type ContextPage = { context(): { addCookies(c: CookieParam[]): Promise<void> } };

export interface MakeAheadFixture {
  /** The other book the buyer also owns (the seed's Comfort Haven collection), or null when the stack has none. */
  otherOwnedSlug: string | null;
  /** Signs the page's browser context in as the Halloween buyer. */
  loginOwner(page: ContextPage): Promise<void>;
  /** Signs in as someone who owns nothing. */
  loginStranger(page: ContextPage): Promise<void>;
  dispose(): Promise<void>;
}

interface CookieParam {
  name: string;
  value: string;
  domain: string;
  path: string;
}

function loopback(raw: string, label: string): URL {
  const url = new URL(raw);
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
    throw new Error(`${label} must be a loopback address for the make-ahead fixtures.`);
  }
  return url;
}

const supabaseUrl = () => loopback(process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321", "NEXT_PUBLIC_SUPABASE_URL").origin;

function databaseUrl(): string {
  const raw = process.env.COMMERCE_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
  loopback(raw, "COMMERCE_DATABASE_URL");
  return raw;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Make-ahead fixtures need ${name} (local stack only, never production).`);
  return value;
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

export async function createMakeAheadFixture(): Promise<MakeAheadFixture> {
  const url = supabaseUrl();
  const anonKey = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const admin = createClient(url, requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const rand = crypto.randomBytes(4).toString("hex");
  const userIds: string[] = [];
  const created = {
    collectionId: null as string | null,
    entitlementIds: [] as string[],
    plan: null as { collectionId: string; previous: unknown | null } | null,
  };
  let otherOwnedSlug: string | null = null;

  async function dispose(): Promise<void> {
    await withPg(async (pg) => {
      await pg.query("DELETE FROM public.access_entitlements WHERE id = ANY($1::uuid[])", [created.entitlementIds]);
      if (created.plan) {
        if (created.plan.previous === null) {
          await pg.query("DELETE FROM public.collection_extras WHERE collection_id=$1 AND kind='make_ahead_plan'", [created.plan.collectionId]);
        } else {
          await pg.query("UPDATE public.collection_extras SET content=$2 WHERE collection_id=$1 AND kind='make_ahead_plan'",
            [created.plan.collectionId, created.plan.previous]);
        }
      }
      if (created.collectionId) {
        await pg.query(`DELETE FROM private.commercial_offers WHERE release_id IN
          (SELECT id FROM public.collection_releases WHERE collection_id=$1)`, [created.collectionId]);
        await pg.query("DELETE FROM public.collection_releases WHERE collection_id=$1", [created.collectionId]);
        await pg.query("DELETE FROM public.recipe_collections WHERE id=$1", [created.collectionId]);
      }
    });
    for (const id of userIds) await admin.auth.admin.deleteUser(id).catch(() => {});
  }

  /** A confirmed user with a password, and real SSR session cookies captured through the app's cookie adapter. */
  async function person(label: string): Promise<{ id: string; cookies: CookieParam[] }> {
    const email = `plan-${label}-${rand}@synthetic.test`;
    const password = crypto.randomBytes(18).toString("base64url");
    const user = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (user.error || !user.data.user) throw new Error(`Make-ahead fixture user failed: ${user.error?.message}`);
    userIds.push(user.data.user.id);
    let captured: { name: string; value: string }[] = [];
    const browser = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => captured,
        setAll: (cookiesToSet) => {
          captured = cookiesToSet.map((cookie) => ({ name: cookie.name, value: cookie.value }));
        },
      },
    });
    const signed = await browser.auth.signInWithPassword({ email, password });
    if (signed.error) throw new Error(`Make-ahead fixture sign-in failed: ${signed.error.message}`);
    const host = new URL(url).hostname;
    return { id: user.data.user.id, cookies: captured.map((cookie) => ({ ...cookie, domain: host, path: "/" })) };
  }

  try {
    const owner = await person("owner");
    const stranger = await person("stranger");
    await withPg(async (pg) => {
      let book = (await pg.query(`SELECT c.id collection_id, r.id release_id FROM public.recipe_collections c
        JOIN public.collection_releases r ON r.collection_id=c.id
        WHERE c.slug='halloween' AND r.state IN ('published','sealed') ORDER BY r.version DESC LIMIT 1`)).rows[0] as
        | { collection_id: string; release_id: string }
        | undefined;
      if (!book) {
        book = { collection_id: crypto.randomUUID(), release_id: crypto.randomUUID() };
        await pg.query(`INSERT INTO public.recipe_collections(id,slug,title,public_summary,listing_state)
          VALUES($1,'halloween','Halloween','Synthetic Halloween book for the make-ahead plan specs','listed')`, [book.collection_id]);
        created.collectionId = book.collection_id;
        await pg.query("INSERT INTO public.collection_releases(id,collection_id,version,state) VALUES($1,$2,1,'published')",
          [book.release_id, book.collection_id]);
        await pg.query(`INSERT INTO private.commercial_offers(release_id,provider_account_id,provider_mode,provider_product_id,
            provider_price_id,currency,base_minor_amount,sale_enabled)
          VALUES($1,'acct_synthetic_plan','test',$2,$3,'usd',599,true)`,
          [book.release_id, `prod_synth_plan_${rand}`, `price_synth_plan_${rand}`]);
      }

      const previous = (await pg.query("SELECT content FROM public.collection_extras WHERE collection_id=$1 AND kind='make_ahead_plan'",
        [book.collection_id])).rows[0]?.content ?? null;
      await pg.query(`INSERT INTO public.collection_extras(collection_id,kind,content) VALUES($1,'make_ahead_plan',$2)
        ON CONFLICT (collection_id,kind) DO UPDATE SET content=EXCLUDED.content`, [book.collection_id, FIXTURE_PLAN]);
      created.plan = { collectionId: book.collection_id, previous };

      const grant = async (releaseId: string) => {
        const entitlement = await pg.query(`INSERT INTO public.access_entitlements(user_id,release_id,state,valid_from)
          VALUES($1,$2,'active',now() - interval '1 minute') RETURNING id`, [owner.id, releaseId]);
        created.entitlementIds.push(entitlement.rows[0].id as string);
      };
      await grant(book.release_id);
      // A second book the buyer owns, to show the plan stays Halloween-only.
      const other = (await pg.query(`SELECT c.slug, r.id FROM public.recipe_collections c JOIN public.collection_releases r
        ON r.collection_id=c.id WHERE c.slug='comfort-haven-collection' AND r.state IN ('published','sealed')
        ORDER BY r.version DESC LIMIT 1`)).rows[0] as { slug: string; id: string } | undefined;
      if (other) {
        await grant(other.id);
        otherOwnedSlug = other.slug;
      }
    });

    return {
      otherOwnedSlug,
      loginOwner: (page) => page.context().addCookies(owner.cookies),
      loginStranger: (page) => page.context().addCookies(stranger.cookies),
      dispose,
    };
  } catch (error) {
    await dispose();
    throw error;
  }
}
