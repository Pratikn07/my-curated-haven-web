# Recovery and support rehearsal

Status: database backup and restore rehearsed (Phase 4 audit, 2026-09-25); checkout, provider and support drills not run.

- **Backup**: daily logical dump plus `recipe-images` mirror via launchd (`ops/backup-production.sh`, 14 days kept). A fresh dump is taken before every production migration.
- **Restore**: rehearsed into an empty local stack; all app rows and policies matched production (`ops/README.md`).
- **Rollback**: Vercel Instant Rollback; see `RELEASE-RECORD.md`.
- **Checkout stop**: checkout is off unless `CHECKOUT_ENABLED=true` and Stripe is configured. Removing `CHECKOUT_ENABLED` and redeploying stops new sales.
- **Monitoring**: `production-smoke.yml` runs after every production deploy and hourly, and emails on failure.

Still needed: the checkout, webhook-backlog and provider-outage drills (QA-O01–QA-O08) on staging with Stripe test mode.

## Earlier status

No checkout kill-switch, provider outage, worker backlog, database outage, backup restore, rollback or staffed support drill was performed for this candidate. Local test fixtures and Phase 8 source tests are not operational recovery evidence.

Before reopening this gate, name the operations and support owners, select an isolated target, record backup/restore and provider-reconciliation evidence, rehearse QA-O01–QA-O08, and use only synthetic identities and Stripe test mode. No customer messages or production mutations are part of this record.
