# BimaHeadquarter Database Restore Runbook

This runbook covers restoring BimaHeadquarter CRM from local SQL backups created by `scripts/backup-database.ps1`.

## Backup Location

Backups are stored on the Windows host:

```text
C:\BimaBackups
```

Log files are stored in:

```text
C:\BimaBackups\logs
```

Backup files use this format:

```text
bima_YYYY-MM-DD_HH-MM.sql
```

## Verify Backup Integrity

Before relying on a backup, confirm that it exists, is non-empty, and contains PostgreSQL dump content:

```powershell
Get-ChildItem C:\BimaBackups\bima_*.sql | Sort-Object LastWriteTime -Descending | Select-Object -First 5
Get-Item C:\BimaBackups\bima_2026-06-17_23-59.sql
Get-Content C:\BimaBackups\bima_2026-06-17_23-59.sql -TotalCount 20
Select-String -Path C:\BimaBackups\bima_2026-06-17_23-59.sql -Pattern "PostgreSQL database dump"
```

For a stronger check, restore into a disposable Neon branch or a local PostgreSQL database and run smoke tests against the restored schema and row counts.

## Restore To A Safe Test Database

Never restore directly into production as the first step. Create a temporary Neon branch or local PostgreSQL database, then restore there:

```powershell
$env:PGPASSWORD = "<target-password>"
psql `
  --host="<target-host>" `
  --port=5432 `
  --username="<target-user>" `
  --dbname="<target-db>" `
  --set=ON_ERROR_STOP=on `
  --file="C:\BimaBackups\bima_2026-06-17_23-59.sql"
```

After restore, verify:

```sql
\dt
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM pdf_records;
SELECT COUNT(*) FROM customer_profiles;
SELECT COUNT(*) FROM audit_logs;
```

Then point a local `.env` at the test branch and run the app smoke checks.

## Emergency Production Recovery

Use this only after confirming the production database is corrupted and after preserving the damaged state for later investigation.

1. Stop application writes if possible.
2. Create a fresh Neon branch from the latest healthy point in time or create a new empty restore target.
3. Restore the selected SQL backup into the restore target.
4. Verify table existence, counts, login, policy records, uploads, customer profiles, renewals, claims, endorsements, reports, and user management.
5. Update production `DATABASE_URL` only after verification.
6. Restart the application and monitor logs.
7. Keep the corrupted database/branch until the incident review is complete.

## Neon Branch Recovery Procedure

Preferred recovery path:

1. In Neon, create a branch from a known-good timestamp before the incident.
2. Copy the branch connection string.
3. Test locally by setting `DATABASE_URL` to the branch connection string.
4. Run read-only checks against key tables.
5. If the branch is healthy, either promote it according to Neon procedures or update deployment environment variables to the recovered branch.
6. Keep local SQL backups as an additional recovery option.

## Production Restore Notes

- Do not run `prisma migrate reset` against production.
- Do not run destructive SQL against production unless a recovery lead has approved it.
- Prefer branch-based recovery over in-place restoration.
- Keep at least one untouched copy of the damaged production state.
- Rotate exposed credentials immediately if a connection string or API key is shared outside trusted systems.

## Scheduled Backup Command

The nightly task should run:

```powershell
powershell.exe -ExecutionPolicy Bypass -File "scripts\backup-database.ps1"
```

The task must run from the repository root or use an absolute script path.

## Windows Task Scheduler Setup

The backup script reads `DATABASE_URL` from the Windows environment. Set it as a user or machine environment variable before scheduling the task. Do not paste credentials into shared tickets, screenshots, or logs.

```powershell
[Environment]::SetEnvironmentVariable("DATABASE_URL", "<BimaHeadquarter Neon production DATABASE_URL>", "User")
```

Create the nightly task from PowerShell:

```powershell
$repo = "C:\Users\abhis\insuredesk-crm"
$script = Join-Path $repo "scripts\backup-database.ps1"
$taskAction = "powershell.exe -ExecutionPolicy Bypass -File `"$script`""

schtasks /Create `
  /TN "BimaHeadquarter Nightly Backup" `
  /SC DAILY `
  /ST 23:59 `
  /TR $taskAction `
  /F
```

Verify the task:

```powershell
schtasks /Query /TN "BimaHeadquarter Nightly Backup" /V /FO LIST
```

Run a manual backup test after confirming `pg_dump.exe` is installed and `DATABASE_URL` is set:

```powershell
powershell.exe -ExecutionPolicy Bypass -File "C:\Users\abhis\insuredesk-crm\scripts\backup-database.ps1"
```

The script will abort unless the database host contains:

```text
ep-gentle-king
```
