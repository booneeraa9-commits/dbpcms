#!/usr/bin/env bash
#
# DBPCMS database restore script.
# Restores a compressed backup created by backup.sh.
#
# Usage:
#   ./scripts/restore.sh backups/dbpcms_2026-08-09_01-00-00.sql.gz
#
# WARNING: this REPLACES the current database contents with the backup.
# It asks for confirmation before proceeding.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/apps/api/.env"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <path-to-backup.sql.gz>" >&2
  echo "Example: $0 backups/dbpcms_2026-08-09_01-00-00.sql.gz" >&2
  exit 1
fi
BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: backup file '$BACKUP_FILE' not found." >&2
  exit 1
fi

DB_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"')"
# Strip Prisma-only query params (e.g. ?schema=public) that psql/pg_dump reject.
DB_URL="${DB_URL%%\?*}"

echo "!! WARNING: This will OVERWRITE the current database with:"
echo "   $BACKUP_FILE"
read -r -p "Type 'yes' to continue: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo "[restore] Resetting schema and restoring ..."
# Recreate a clean public schema first so the restore is exact (no leftovers,
# no "already exists" errors), then load the dump.
RESET_SQL="DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^dbpcms_db$'; then
  docker exec -i -e PGPASSWORD=dbpcms_dev_password dbpcms_db psql -U dbpcms -d dbpcms -c "$RESET_SQL"
  gunzip -c "$BACKUP_FILE" | docker exec -i -e PGPASSWORD=dbpcms_dev_password dbpcms_db \
    psql -U dbpcms -d dbpcms
else
  psql "$DB_URL" -c "$RESET_SQL"
  gunzip -c "$BACKUP_FILE" | psql "$DB_URL"
fi

echo "[restore] Complete. (You may need to restart the app.)"
