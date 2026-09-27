# Production configuration record

Phase 11 task P11-03. Every service the live site depends on, with setting names, owners and how each was checked. **No secret values here**: they live only in Vercel and Supabase. Checked 2026-09-26 against `main`; update this file whenever a setting changes.

Owner of every row: the site owner (the only operator). Backup operator: none yet.

## Website hosting: Vercel

| Setting | Value | Checked |
| --- | --- | --- |
| Team / project | `pratik-r-nandoskars-projects` / `my-curated-haven-web` (`prj_UOge0Wtvr6AtdoAhdGKc76E2RqKr`) | `vercel project inspect` |
| Plan | **Hobby (free)**. Non-commercial use only: upgrade to Pro before checkout opens (M11-02). Hobby also caps image optimisation at 5,000 transformations a month | Vercel fair-use guidelines |
| Root directory, Node | `my-curated-haven-web`, Node 24.x (`.nvmrc` 24.5.0) | `vercel project inspect` |
| Build | Next.js preset, `npm run build` | same |
| Deploys | Every merge to `main` deploys to production automatically. PRs get preview deployments | GitHub deployments |
| Rollback | Vercel → Deployments → previous production deployment → **Instant Rollback**. Check its commit is newer than every applied migration first | Phase 10 R10-02 |

### Production environment variables (names only)

| Name | Purpose | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | No (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public (anon) key | No (public by design) |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | PostHog project key, `https://us.i.posthog.com` | No (public by design) |
| `NEXT_PUBLIC_APP_ENV` | `production`; gates remote analytics | No |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | `true`; set `false` and redeploy to switch analytics off | No |
| `VERCEL_FORCE_NO_BUILD_CACHE` | `1`; the build cache once shipped stale CSS | No |

Not set, so checkout stays off: `CHECKOUT_ENABLED`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_EXPECTED_ACCOUNT_ID`, `COMMERCE_DATABASE_URL`. `NEXT_PUBLIC_*` values are built into the site, so changing one needs a redeploy.

## Domain and DNS

| Setting | Value | Checked |
| --- | --- | --- |
| Registrar | Hostinger. **Expires 2027-01-28**: confirm auto-renew | `whois` |
| DNS | Hostinger (`ns1/ns2.dns-parking.com`) | `dig NS` |
| Canonical origin | `https://mycuratedhaven.com`; `www` redirects with 308 | smoke check |
| TLS | Vercel certificate, HSTS `max-age=63072000` | `curl -I` |
| **Mail (MX)** | **None.** Mail to `support@mycuratedhaven.com` can't be delivered (M11-03) | `dig MX` via 1.1.1.1 and 8.8.8.8 |
| SPF / DKIM / DMARC | None yet; added with the sign-in email provider (A1) | `dig TXT` |

## Database and sign-in: Supabase

| Setting | Value | Checked |
| --- | --- | --- |
| Organisation / plan | `My curated Haven`, free plan. 1 active project, 1 paused (`Compass`) | Management API |
| Product project | `ccrgvammglkvdlaojgzv` (us-east-2), shared with the iOS app | same |
| Instagram project | `kukpvpklizsvedcmybhn` (`insta-automation`, org `tinysoho`). Never run recipe migrations there | same |
| Migrations | Applied one at a time in `BEGIN/COMMIT`, then `supabase migration repair`. Never a blind `db push` or `config push` | `supabase migration list --linked` |
| Pending, in order | `20260923200000` commerce schema → `20260924010000` measurement → `20260924174355` Phase 8 guards (with checkout only) | same |
| Sign-in email sender | **Built-in**: only delivers to the Supabase team (1 member), 2 emails an hour (M11-01) | auth config: `smtp_host` empty, `rate_limit_email_sent` 2 |
| Code expiry | `mailer_otp_exp` 3600 s | auth config |
| Site URL, redirects | `https://mycuratedhaven.com`; allow list includes `https://mycuratedhaven.com/**` and the iOS app schemes | auth config |
| CAPTCHA | Off (M7-01, Turnstile) | auth config |
| Backups | Supabase free plan: none. Daily dump and image mirror at 03:30 via launchd on the owner's Mac, 14 days kept, restore rehearsed (`ops/README.md`) | `~/MyCuratedHavenBackups/backup.log` |
| Pausing | Free projects pause when idle; the hourly smoke check reads recipes, which keeps it active | `production-smoke.yml` |

## Analytics: PostHog

| Setting | Value |
| --- | --- |
| Project | `Default project`, US Cloud (`us.i.posthog.com`), project 630160, Free plan (1M events, 5K recordings a month) |
| Captured | Page views, clicks, identified signed-in users, session recordings (inputs masked, none on sign-in, account, checkout) |
| Warehouse source | GitHub `pratikn07/my-curated-haven-web` (`pull_requests`, `commits`), read-only token |

## Monitoring

| Check | Where | Alerts |
| --- | --- | --- |
| Production smoke (7 pages, sitemap, the 3 free recipes with ingredients and steps, `/features` stays hidden, www redirect) | `.github/workflows/production-smoke.yml`, after each production deploy and hourly | GitHub emails the owner on failure |
| CI | `web-quality`, `backend-quality` required on `main` | PR checks |

## Payments: Stripe

Not set up (M8-02). Checkout needs `CHECKOUT_ENABLED=true` and Stripe configured in a deployed environment (`src/lib/payments/config.ts`).
