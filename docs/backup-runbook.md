# DBPCMS — Backup & Restore Runbook

A backup you have never restored is not a backup. This runbook explains how to
back up and restore DBPCMS data — and how to schedule it automatically.

## What gets backed up
- The **PostgreSQL database** (all records: users, employees, students, grades…)
  as a compressed SQL dump.
- **Uploaded files** (employee/student photos, documents) as a `.tar.gz`, when a
  local `apps/api/storage` folder exists.

Backups are written to the `backups/` folder in the project root.

## Manual backup
From the project root:
```bash
./scripts/backup.sh
```
Produces e.g. `backups/dbpcms_2026-08-09_01-00-00.sql.gz`.

## Manual restore
> WARNING: restore REPLACES the current database with the backup. It resets the
> schema first, then loads the dump. It asks for confirmation.
```bash
./scripts/restore.sh backups/dbpcms_2026-08-09_01-00-00.sql.gz
```

## Scheduling nightly backups (cron)
On the server (local Linux or the VPS), edit the crontab:
```bash
crontab -e
```
Add a line to run every night at 1:00 AM (adjust the path):
```
0 1 * * * cd /home/USER/projects/dbpcms && ./scripts/backup.sh >> backups/backup.log 2>&1
```

## Retention
Backups older than **14 days** are removed automatically. Change it by setting
`BACKUP_RETENTION_DAYS` before running, e.g.:
```bash
BACKUP_RETENTION_DAYS=30 ./scripts/backup.sh
```

## Off-server copies (important on the VPS)
A backup on the same machine doesn't protect against the machine dying. On the
VPS, periodically copy `backups/*.gz` to another location (e.g. another server,
or a secure external drive). Example with `scp`:
```bash
scp backups/dbpcms_*.sql.gz youruser@another-host:/safe/place/
```

## Test your restore regularly
Every few months, actually restore the latest backup into a scratch database and
confirm the app starts and data looks right. This is the only way to know your
backups truly work.

## Convenience scripts (from the repo root)
```bash
pnpm backup     # runs scripts/backup.sh
pnpm restore    # prints usage; pass the file to scripts/restore.sh
```
