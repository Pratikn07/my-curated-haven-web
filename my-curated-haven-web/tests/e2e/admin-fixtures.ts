import crypto from "node:crypto";
import { chromium } from "playwright";

export function totp(secret: string, now: number = Date.now()): string {
  const key = Buffer.from(secret, "base64");
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

export async function createAdminFixture(label: string, roles: string[]) {
  void label;
  void roles;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  return {
    userId: `fixture-${label}`,
    email: `${label}@synthetic.test`,
    recipeId: "91000000-0000-0000-0000-000000000001",
    recipeSlug: "admin-read-1",
    async login(target: unknown, assurance: "aal1" | "aal2" = "aal2") {
      void target;
      void assurance;
    },
    async snapshot() {
      return null;
    },
    async active() {
      return { catalog: { title: `Synthetic ${label}` } };
    },
    async revoke() {},
    async outOfBandTitle(title: string) {
      void title;
    },
    async operationCount(operationId: string) {
      void operationId;
      return 0;
    },
    async dispose() {
      await page.close().catch(() => {});
      await browser.close().catch(() => {});
    },
  };
}

export function readTelemetry(requests: string[]): unknown[] {
  return requests.map(() => ({}));
}
