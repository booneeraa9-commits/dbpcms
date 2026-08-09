#!/usr/bin/env bash
#
# DBPCMS database backup script.
# Creates a compressed, timestamped PostgreSQL dump and rotates old backups.
#
# Usage:
#   ./scripts/backup.sh
#
# It reads the database connection from apps/api/.env (DATABASE_URL), works both
# for the local Docker database and the VPS. Backups are written to ./backups/.
#
# Schedule it nightly with cron (see docs/backup-runbook.md).

set -euo pipefail

# --- Resolve paths (works no matter where it's called from) ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/apps/api/.env"
BACKUP_DIR="$PROJECT_ROOT/backups"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"   # keep 14 days by default

mkdir -p "$BACKUP_DIR"

# --- Read DATABASE_URL from .env ---
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Copy apps/api/.env.example to .env first." >&2
  exit 1
fi
DB_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"')"
if [ -z "${DB_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set in $ENV_FILE" >&2
  exit 1
fi
# Strip Prisma-only query params (e.g. ?schema=public) that pg_dump rejects.
DB_URL="${DB_URL%%\?*}"

TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
OUTFILE="$BACKUP_DIR/dbpcms_${TIMESTAMP}.sql.gz"

echo "[backup] Dumping database to $OUTFILE ..."

# --- Run pg_dump. Prefer Docker (local dev); fall back to a local pg_dump. ---
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^dbpcms_db$'; then
  # Local Docker database: run pg_dump inside the container.
  docker exec -e PGPASSWORD=dbpcms_dev_password dbpcms_db \
    pg_dump -U dbpcms -d dbpcms --no-owner --no-privileges | gzip > "$OUTFILE"
else
  # VPS / direct connection: use the local pg_dump against DATABASE_URL.
  pg_dump "$DB_URL" --no-owner --no-privileges | gzip > "$OUTFILE"
fi

SIZE="$(du -h "$OUTFILE" | cut -f1)"
echo "[backup] Done. Size: $SIZE"

# --- Back up uploaded files (documents/photos) too, if present ---
STORAGE_DIR="$PROJECT_ROOT/apps/api/storage"
if [ -d "$STORAGE_DIR" ]; then
  FILES_OUT="$BACKUP_DIR/dbpcms_files_${TIMESTAMP}.tar.gz"
  tar -czf "$FILES_OUT" -C "$PROJECT_ROOT/apps/api" storage
  echo "[backup] Uploaded files backed up to $FILES_OUT"
fi

# --- Rotate: delete backups older than RETENTION_DAYS ---
find "$BACKUP_DIR" -name 'dbpcms_*.gz' -type f -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
echo "[backup] Old backups older than ${RETENTION_DAYS} days removed."
echo "[backup] Complete."
