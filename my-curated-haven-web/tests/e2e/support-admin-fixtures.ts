import crypto from "node:crypto";
import { Client } from "pg";
import { createAdminFixture, type AdminFixture, type Assurance } from "./admin-fixtures";

/**
 * Synthetic customer-support scenarios for admin browser specs, on the owned local stack only. One staff member in
 * the chosen role, one real customer account, and a synthetic collection with a paid order (with a partial refund)
 * and an older order whose snapshot lacks the newer fields. Support case history is immutable and is not deleted:
 * orders a case refers to stay until the owned stack is reset.
 */

export type SupportRole = "owner" | "recipe_editor" | "support_viewer" | "support_operator" | "customer";
export type SupportStage = "disabled" | "inspection" | "diagnosis" | "repair";
type Page = Parameters<AdminFixture["login"]>[0];

const ROLES: Record<SupportRole, string[]> = {
  owner: ["owner"], recipe_editor: ["editor"], support_viewer: ["support_viewer"], support_operator: ["support_operator"],
  customer: [],
};

export interface SupportFixture {
  staffEmail: string;
  customerId: string;
  customerEmail: string;
  orderId: string;
  supportReference: string;
  legacyOrderId: string;
  legacyReference: string;
  login(page: Page, aal?: Assurance): Promise<void>;
  /** Revoke the staff member's console membership now. */
  revoke(): Promise<void>;
  /** Delete the customer's account, as a closed account would leave it; orders keep their principal. */
  closeCustomer(): Promise<void>;
  setNoteRetention(days: number | null): Promise<void>;
  collectionId: string;
  paymentIntentId: string;
  paymentId: string;
  /** Revoke the local verifier registration (only when the fixture registered one). */
  revokeVerifier(): Promise<void>;
  query(sql: string, args?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  dispose(): Promise<void>;
}

function databaseUrl(): string {
  const raw = process.env.ADMIN_TEST_DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54362/postgres";
  const host = new URL(raw).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") throw new Error("Support fixtures refuse non-loopback databases.");
  return raw;
}

async function withPg<T>(fn: (pg: Client) => Promise<T>): Promise<T> {
  const pg = new Client({ connectionString: databaseUrl() });
  await pg.connect();
  try {
    await pg.query("SET SESSION lock_timeout = '15s'");
    return await fn(pg);
  } finally {
    await pg.end();
  }
}

export async function setSupportStage(stage: SupportStage): Promise<SupportStage> {
  return withPg(async (pg) => {
    const before = (await pg.query("SELECT stage FROM private.support_workspace_settings WHERE singleton")).rows[0].stage as SupportStage;
    await pg.query("UPDATE private.support_workspace_settings SET stage=$1 WHERE singleton", [stage]);
    return before;
  });
}

/**
 * `verifier` registers this test database login as the provider verifier, so the app's verifier connection (the same
 * loopback login) may claim checks; the registration is removed on dispose. `policyVersion` freezes the order under
 * that refund and access policy version and approves a synthetic policy for it (removed on dispose), so automated
 * reconciliation may judge this order without approving `v1` on the shared stack.
 */
export async function createSupportFixture(role: SupportRole, stage: SupportStage = "inspection",
  options: { verifier?: boolean; policyVersion?: string } = {}): Promise<SupportFixture> {
  const policyVersion = options.policyVersion ?? "v1";
  let insertedPolicy = false;
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  const staff = await createAdminFixture(`support-${role}`.slice(0, 12), ROLES[role]);
  const customer = await createAdminFixture("support-cust", []);
  const originalStage = await setSupportStage(stage);
  const originalRetention = (await withPg((pg) =>
    pg.query("SELECT note_retention_days FROM private.support_workspace_settings WHERE singleton"))).rows[0].note_retention_days as number | null;
  const collectionId = crypto.randomUUID();
  const releaseId = crypto.randomUUID();
  const offerId = crypto.randomUUID();
  const orderId = crypto.randomUUID();
  const legacyOrderId = crypto.randomUUID();
  const paymentId = crypto.randomUUID();
  const supportReference = `MCH-${rand}`;
  const legacyReference = `MCH-L${rand.slice(0, 5)}`;
  let disposed = false;

  async function dispose(): Promise<void> {
    if (disposed) return;
    disposed = true;
    await withPg(async (pg) => {
      await pg.query("UPDATE private.support_workspace_settings SET stage=$1, note_retention_days=$2 WHERE singleton",
        [originalStage, originalRetention]);
      if (options.verifier) {
        await pg.query("DELETE FROM private.commerce_verifier_principals WHERE principal = current_user AND registered_by = $1", [staff.userId]);
      }
      if (insertedPolicy) {
        // Approved policies cannot be removed in normal use; this synthetic one is removed with its guard paused.
        await pg.query("ALTER TABLE private.commerce_access_policies DISABLE TRIGGER commerce_access_policies_immutable");
        try {
          await pg.query("DELETE FROM private.commerce_access_policies WHERE refund_policy_version=$1 AND access_policy_version=$1",
            [policyVersion]);
        } finally {
          await pg.query("ALTER TABLE private.commerce_access_policies ENABLE TRIGGER commerce_access_policies_immutable");
        }
      }
      // Orders that a support case or provider check refers to stay (that history cannot be deleted); the rest is removed.
      const referenced = (await pg.query(`SELECT 1 FROM private.support_cases WHERE order_id = ANY($1)
        UNION ALL SELECT 1 FROM private.commerce_verification_jobs WHERE order_id = ANY($1)`, [[orderId, legacyOrderId]])).rowCount;
      if (!referenced) {
        await pg.query("DELETE FROM private.payment_refunds WHERE order_id = ANY($1)", [[orderId, legacyOrderId]]);
        await pg.query("DELETE FROM private.provider_payments WHERE order_id = ANY($1)", [[orderId, legacyOrderId]]);
        await pg.query("DELETE FROM private.access_sources WHERE release_id=$1", [releaseId]);
        await pg.query("DELETE FROM public.access_entitlements WHERE release_id=$1", [releaseId]);
        await pg.query("DELETE FROM private.purchase_orders WHERE id = ANY($1)", [[orderId, legacyOrderId]]);
        await pg.query("DELETE FROM private.collection_access_policies WHERE release_id=$1", [releaseId]);
        await pg.query("DELETE FROM private.commercial_offers WHERE id=$1", [offerId]);
        await pg.query("DELETE FROM public.collection_recipes WHERE release_id=$1", [releaseId]);
        await pg.query("DELETE FROM public.collection_releases WHERE id=$1", [releaseId]);
        await pg.query("DELETE FROM public.recipe_collections WHERE id=$1", [collectionId]);
      }
    });
    await staff.dispose();
    await customer.dispose();
  }

  try {
    await withPg(async (pg) => {
      await pg.query("INSERT INTO public.recipe_collections(id,slug,title,public_summary,listing_state) VALUES($1,$2,$3,'Synthetic','unlisted')",
        [collectionId, `synthetic-support-${rand.toLowerCase()}`, `Synthetic support ${rand}`]);
      await pg.query("INSERT INTO public.collection_releases(id,collection_id,version,state) VALUES($1,$2,1,'published')", [releaseId, collectionId]);
      await pg.query("INSERT INTO public.collection_recipes(release_id,recipe_id,position) VALUES($1,$2,1)", [releaseId, staff.recipeId]);
      await pg.query(`INSERT INTO private.commercial_offers(id,release_id,provider_account_id,provider_mode,provider_product_id,
          provider_price_id,currency,base_minor_amount,sale_enabled,manifest_hash) VALUES($1,$2,'acct_synthetic','test',$3,$4,'usd',1500,false,$5)`,
        [offerId, releaseId, `prod_support_${rand}`, `price_support_${rand}`, "b".repeat(64)]);
      const snapshot = { offer_id: offerId, release_id: releaseId, price_id: `price_support_${rand}`, price_minor: 1500, currency: "usd",
        provider_account_id: "acct_synthetic", provider_mode: "test", terms_version: "v1", collection_id: collectionId,
        publication_id: null, product_id: `prod_support_${rand}`, tax_mode: "exclusive", quantity: 1, refund_policy_version: policyVersion,
        access_policy_version: policyVersion, member_recipe_ids: [staff.recipeId], manifest_hash: "b".repeat(64), source_digest: "c".repeat(64),
        frozen_at: new Date().toISOString() };
      await pg.query(`INSERT INTO private.purchase_orders(id,support_reference,owner_principal,user_id,offer_id,release_id,snapshot,
          attempt_state,session_id,idempotency_key,version) VALUES($1,$2,$3,$3,$4,$5,$6::jsonb,'closed',$7,$8,2)`,
        [orderId, supportReference, customer.userId, offerId, releaseId, snapshot, `cs_test_support_${rand}`, `support-${rand}-1`]);
      await pg.query(`INSERT INTO private.purchase_orders(id,support_reference,owner_principal,user_id,offer_id,release_id,snapshot,
          attempt_state,session_id,idempotency_key,version) VALUES($1,$2,$3,$3,$4,$5,$6::jsonb,'closed',$7,$8,1)`,
        [legacyOrderId, legacyReference, customer.userId, offerId, releaseId,
          { offer_id: offerId, release_id: releaseId, price_minor: 1500, currency: "usd", provider_account_id: "acct_synthetic",
            provider_mode: "test", terms_version: "v1" }, `cs_test_legacy_${rand}`, `support-${rand}-2`]);
      await pg.query(`INSERT INTO private.provider_payments(id,order_id,provider_account_id,provider_mode,payment_intent_id,charge_id,
          status,captured_amount,currency,paid_at,verified_at) VALUES($1,$2,'acct_synthetic','test',$3,$4,'succeeded',1500,'usd',now(),now())`,
        [paymentId, orderId, `pi_support_${rand}`, `ch_support_${rand}`]);
      await pg.query(`INSERT INTO private.payment_refunds(provider_refund_id,order_id,payment_id,amount,currency,status,occurred_at,verified_at)
        VALUES($1,$2,$3,100,'usd','succeeded',now(),now())`, [`re_support_${rand}`, orderId, paymentId]);
      await pg.query(`INSERT INTO private.access_sources(user_id,release_id,source_kind,source_id) VALUES($1,$2,'stripe_purchase',$3)`,
        [customer.userId, releaseId, orderId]);
      await pg.query("INSERT INTO public.access_entitlements(user_id,release_id,state) VALUES($1,$2,'active')", [customer.userId, releaseId]);
      await pg.query(`INSERT INTO private.collection_access_policies(release_id,source_kind,policy,approved_by,approval_reason)
        VALUES($1,'stripe_purchase','additions-v1',$2,'Synthetic support fixture')`, [releaseId, staff.userId]);
      if (options.policyVersion) {
        insertedPolicy = (await pg.query(`INSERT INTO private.commerce_access_policies(refund_policy_version,access_policy_version,policy,
            approved_by,evidence) VALUES($1,$1,$2::jsonb,$3,'Synthetic browser test policy') ON CONFLICT DO NOTHING RETURNING 1`,
          [policyVersion, { id: `synthetic-${policyVersion}`, approved: true, version: policyVersion, pendingRefund: "retain",
            partialRefund: "retain", fullRefund: "ineligible", inquiry: "retain", formalOpen: "hold", formalLost: "ineligible",
            duration: "indefinite", fixedSeconds: null }, staff.userId])).rowCount === 1;
      }
      if (options.verifier) {
        await pg.query(`INSERT INTO private.commerce_verifier_principals(principal,label,registered_by)
          VALUES(current_user,'Local test verifier',$1)
          ON CONFLICT (principal) DO UPDATE SET label=EXCLUDED.label, registered_by=EXCLUDED.registered_by, revoked_at=NULL`, [staff.userId]);
      }
    });
  } catch (error) {
    await dispose();
    throw error;
  }

  return {
    staffEmail: staff.email,
    customerId: customer.userId,
    customerEmail: customer.email,
    orderId,
    supportReference,
    legacyOrderId,
    legacyReference,
    collectionId,
    paymentIntentId: `pi_support_${rand}`,
    paymentId,
    login: (page, aal = "aal2") => role === "customer" ? customer.login(page, aal) : staff.login(page, aal),
    revoke: () => staff.revoke(),
    closeCustomer: async () => {
      await withPg((pg) => pg.query("DELETE FROM auth.users WHERE id=$1", [customer.userId]));
    },
    setNoteRetention: async (days) => {
      await withPg((pg) => pg.query("UPDATE private.support_workspace_settings SET note_retention_days=$1 WHERE singleton", [days]));
    },
    revokeVerifier: async () => {
      await withPg((pg) => pg.query("UPDATE private.commerce_verifier_principals SET revoked_at=now() WHERE principal=current_user"));
    },
    query: (sql, args = []) => withPg((pg) => pg.query(sql, args)),
    dispose,
  };
}
