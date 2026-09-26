#!/usr/bin/env bash
# Free daily backup of the production Supabase project (audit R4-02).
#
# The free Supabase plan keeps no backups, so this runs on the owner's Mac:
#   - logical dump: roles.sql, schema.sql, data.sql (via the Supabase CLI, which uses Docker)
#   - mirror of the public recipe-images bucket (files are not in a database dump)
# Output contains personal data. It stays in BACKUP_ROOT (mode 700) and never goes to git.
#
# Usage: ops/backup-production.sh            (normally run by launchd, see ops/README.md)
# Env:   BACKUP_ROOT (default ~/MyCuratedHavenBackups, outside macOS-protected folders), KEEP_DAYS (default 14)

set -euo pipefail

PROJECT_REF="ccrgvammglkvdlaojgzv"
BACKUP_ROOT="${BACKUP_ROOT:-$HOME/MyCuratedHavenBackups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

umask 077
stamp="$(date +%Y-%m-%d)"
daily_dir="$BACKUP_ROOT/daily/$stamp"
workdir="$BACKUP_ROOT/.supabase-workdir"
log() { printf '%s %s\n' "$(date '+%Y-%m-%dT%H:%M:%S')" "$*"; }

mkdir -p "$daily_dir" "$workdir/supabase/.temp" "$BACKUP_ROOT/storage/recipe-images"
chmod 700 "$BACKUP_ROOT"
printf '%s' "$PROJECT_REF" > "$workdir/supabase/.temp/project-ref"

# The CLI runs pg_dump in Docker. Start Docker Desktop if it is not running.
if ! docker info >/dev/null 2>&1; then
  log "starting Docker Desktop"
  open -a Docker
  for _ in $(seq 1 60); do docker info >/dev/null 2>&1 && break; sleep 5; done
  docker info >/dev/null 2>&1 || { log "ERROR Docker did not start"; exit 1; }
fi

log "dumping database to $daily_dir"
supabase --workdir "$workdir" db dump --linked --role-only -f "$daily_dir/roles.sql"
supabase --workdir "$workdir" db dump --linked -f "$daily_dir/schema.sql"
supabase --workdir "$workdir" db dump --linked --data-only -f "$daily_dir/data.sql"

# A dump that is empty or truncated is a failed backup, not a success.
[ "$(wc -c < "$daily_dir/schema.sql")" -gt 10000 ] || { log "ERROR schema.sql too small"; exit 1; }
[ "$(wc -c < "$daily_dir/data.sql")" -gt 10000 ] || { log "ERROR data.sql too small"; exit 1; }
grep -q "CREATE POLICY" "$daily_dir/schema.sql" || { log "ERROR schema.sql has no policies"; exit 1; }

log "mirroring the recipe-images bucket"
anon_key="$(supabase projects api-keys --project-ref "$PROJECT_REF" -o json \
  | python3 -c 'import sys,json; print([k["api_key"] for k in json.load(sys.stdin) if k["name"]=="anon"][0])')"
base="https://$PROJECT_REF.supabase.co/storage/v1"
curl -fsS -X POST "$base/object/list/recipe-images" \
  -H "apikey: $anon_key" -H "Authorization: Bearer $anon_key" -H "Content-Type: application/json" \
  -d '{"prefix":"","limit":1000}' \
  | python3 -c 'import sys,json; [print(o["name"]) for o in json.load(sys.stdin) if o.get("id")]' \
  > "$daily_dir/recipe-images.txt"
downloaded=0
while IFS= read -r name; do
  target="$BACKUP_ROOT/storage/recipe-images/$name"
  if [ ! -s "$target" ]; then
    curl -fsS -o "$target" "$base/object/public/recipe-images/$name"
    downloaded=$((downloaded + 1))
  fi
done < "$daily_dir/recipe-images.txt"
log "recipe-images: $(wc -l < "$daily_dir/recipe-images.txt" | tr -d ' ') listed, $downloaded new"

chmod -R go-rwx "$BACKUP_ROOT"
find "$BACKUP_ROOT/daily" -mindepth 1 -maxdepth 1 -type d -mtime +"$KEEP_DAYS" -exec rm -rf {} +
log "done: $(du -sh "$daily_dir" | cut -f1) in $daily_dir; keeping $KEEP_DAYS days"
