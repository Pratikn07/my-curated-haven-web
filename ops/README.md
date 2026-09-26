# Operations scripts

## Production backup (free plan)

The Supabase project `ccrgvammglkvdlaojgzv` is on the free plan, which keeps no platform backups. `backup-production.sh` makes one every day on the owner's Mac:

- `daily/YYYY-MM-DD/roles.sql`, `schema.sql`, `data.sql`: logical dump through the Supabase CLI.
- `storage/recipe-images/`: a mirror of the public recipe image bucket. Database dumps don't include files.
- Keeps 14 days of dumps. The image mirror only adds new files.

Output contains personal data. It lives in `~/MyCuratedHavenBackups` (mode 700) and never goes to git, GitHub Actions or any shared drive.

Requirements: Supabase CLI logged in (`supabase login`), Docker Desktop installed. The script starts Docker if it isn't running.

### Install the daily schedule

Copy the script outside the repository, so switching branches can't remove it, then load the launchd job. Keep it outside `~/Documents`, `~/Desktop` and `~/Downloads`: macOS blocks launchd jobs from those folders unless you grant Full Disk Access.

```bash
mkdir -p ~/MyCuratedHavenBackups && chmod 700 ~/MyCuratedHavenBackups
cp ops/backup-production.sh ~/MyCuratedHavenBackups/backup-production.sh
sed -e "s#BACKUP_SCRIPT_PATH#$HOME/MyCuratedHavenBackups/backup-production.sh#" \
    -e "s#BACKUP_ROOT_PATH#$HOME/MyCuratedHavenBackups#" \
    ops/com.mycuratedhaven.backup.plist > ~/Library/LaunchAgents/com.mycuratedhaven.backup.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.mycuratedhaven.backup.plist
```

It runs at 03:30. If the Mac is asleep, launchd runs it on the next wake. It does not run while the Mac is shut down.

Run it now: `launchctl kickstart gui/$(id -u)/com.mycuratedhaven.backup`. Log: `~/MyCuratedHavenBackups/backup.log`.

Uninstall: `launchctl bootout gui/$(id -u)/com.mycuratedhaven.backup`, then delete the plist.

### Before a production migration

Always take a fresh backup first: run the script by hand, or use `supabase db dump --linked` into a new folder under `~/MyCuratedHavenBackups/`.

### Restore

Rehearsed on 2026-09-25 from that night's backup into an empty local Supabase stack. The app data restored completely: 70 recipes, 70 catalog rows (3 published), 70 bodies, 3 free slots, 4 profiles, 4 auth users, 69 public policies. An anonymous REST caller got the 3 free recipes and nothing from `profiles` or `children`.

1. Create an empty target: a new Supabase project (preferred, because its storage version matches production) or a fresh local stack.
2. Run the three files in one transaction **as the superuser**. `roles.sql` alters the reserved `supabase_admin` role, so `postgres` is not enough:

   ```bash
   psql "$TARGET_SUPERUSER_URL" --single-transaction -v ON_ERROR_STOP=1 \
     -f roles.sql -f schema.sql -c 'SET session_replication_role = replica' -f data.sql
   ```

   Locally the superuser is `supabase_admin` inside the `supabase_db_<project>` container.
3. If the target's storage version is older than production's, the `storage.buckets` insert fails (`column "versioning_status" does not exist`). Drop the `INSERT INTO "storage".…` statements from a copy of `data.sql`, restore, then recreate the buckets and re-upload files from `storage/recipe-images/`.
4. **Re-check grants.** A new project grants new public tables to `anon` and `authenticated` by default, so revokes in the dump don't carry over. After the rehearsal, `public.recipes` returned an empty 200 instead of 401. RLS still blocked every row. Re-run the `REVOKE` statements from `supabase/migrations/20260924120000_phase4_access_hardening.sql` and `20260926020339_phase4_audit_storage_and_rpc_hardening.sql`, then confirm anonymous `recipes` returns 401.
5. Reload the API schema (`NOTIFY pgrst, 'reload schema'`) and verify as a real caller: anonymous REST reads, then `npm run smoke:production -- --origin=<target>` once a site points at it.

### Limits

- A Mac that is off or away from the internet means no backup that day. Check `backup.log` weekly.
- There is no point-in-time recovery. The worst case loses up to a day of changes.
- Supabase Pro adds daily platform backups, if the free approach stops being enough.
