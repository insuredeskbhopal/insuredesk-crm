param(
param(
  [string]$BackupRoot = "C:\BimaBackups",
  [string]$RequiredHostFragment = "ep-gentle-king",
  [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"

$timestamp = Get-Date
$backupDate = $timestamp.ToString("yyyy-MM-dd")
$backupStamp = $timestamp.ToString("yyyy-MM-dd_HH-mm")
$logRoot = Join-Path $BackupRoot "logs"
$logFile = Join-Path $logRoot "backup-log-$backupDate.txt"
$backupFile = Join-Path $BackupRoot "bima_$backupStamp.sql"

function Ensure-Directory {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Write-BackupLog {
  param([string]$Message)
  $line = "{0} {1}" -f (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -LiteralPath $logFile -Value $line
}

function Fail-Backup {
  param(
    [string]$Message,
    [int]$Code = 1
  )
  Write-BackupLog "ERROR: $Message"
  Write-BackupLog "End time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
  exit $Code
}

function Get-QueryValue {
  param(
    [string]$Query,
    [string]$Name
  )
  if ([string]::IsNullOrWhiteSpace($Query)) { return $null }
  $cleanQuery = $Query.TrimStart("?")
  foreach ($pair in $cleanQuery -split "&") {
    if ([string]::IsNullOrWhiteSpace($pair)) { continue }
    $parts = $pair -split "=", 2
    if ($parts[0] -eq $Name) {
      if ($parts.Count -gt 1) {
        return [System.Uri]::UnescapeDataString($parts[1])
      }
      return ""
    }
  }
  return $null
}

Ensure-Directory $BackupRoot
Ensure-Directory $logRoot

Write-BackupLog "============================================================"
Write-BackupLog "Start time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-BackupLog "Backup root: $BackupRoot"
Write-BackupLog "Required host fragment: $RequiredHostFragment"

$databaseUrl = $env:DATABASE_URL
if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
  Fail-Backup "DATABASE_URL environment variable is not set."
}

try {
  $databaseUri = [System.Uri]$databaseUrl
} catch {
  Fail-Backup "DATABASE_URL is not a valid PostgreSQL connection URL."
}

if ($databaseUri.Scheme -ne "postgresql" -and $databaseUri.Scheme -ne "postgres") {
  Fail-Backup "DATABASE_URL must use the postgresql:// or postgres:// scheme."
}

$databaseHost = $databaseUri.Host
Write-BackupLog "Database host: $databaseHost"

if ($databaseHost -notlike "*$RequiredHostFragment*") {
  Write-BackupLog "ABORT BACKUP"
  Write-BackupLog "WRONG DATABASE DETECTED"
  Write-Output "ABORT BACKUP"
  Write-Output "WRONG DATABASE DETECTED"
  Fail-Backup "Host '$databaseHost' does not match required BimaHeadquarter host fragment '$RequiredHostFragment'." 2
}

if ([string]::IsNullOrWhiteSpace($databaseUri.UserInfo) -or $databaseUri.UserInfo -notmatch ":") {
  Fail-Backup "DATABASE_URL must include username and password."
}

$userInfoParts = $databaseUri.UserInfo -split ":", 2
$databaseUser = [System.Uri]::UnescapeDataString($userInfoParts[0])
$databasePassword = [System.Uri]::UnescapeDataString($userInfoParts[1])
$databaseName = $databaseUri.AbsolutePath.TrimStart("/")
$databasePort = if ($databaseUri.Port -gt 0) { $databaseUri.Port } else { 5432 }
$sslMode = Get-QueryValue -Query $databaseUri.Query -Name "sslmode"
if ([string]::IsNullOrWhiteSpace($sslMode)) {
  $sslMode = "require"
}

if ([string]::IsNullOrWhiteSpace($databaseName)) {
  Fail-Backup "DATABASE_URL does not include a database name."
}

$pgDumpCommand = Get-Command "pg_dump" -ErrorAction SilentlyContinue
$pgDumpPath = if ($pgDumpCommand) { $pgDumpCommand.Source } else { $null }

if (-not $pgDumpPath) {
  $candidatePgDumpPaths = @(
    "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe"
  )

  $pgDumpPath = $candidatePgDumpPaths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}

if (-not $pgDumpPath) {
  Fail-Backup "pg_dump was not found in PATH. Install PostgreSQL client tools and add pg_dump.exe to PATH."
}

Write-BackupLog "pg_dump path: $pgDumpPath"
Write-BackupLog "Backup file: $backupFile"

$previousPgPassword = $env:PGPASSWORD
$previousPgSslMode = $env:PGSSLMODE

try {
  $env:PGPASSWORD = $databasePassword
  $env:PGSSLMODE = $sslMode

  $pgDumpArgs = @(
    "--host=$databaseHost",
    "--port=$databasePort",
    "--username=$databaseUser",
    "--dbname=$databaseName",
    "--file=$backupFile",
    "--format=p",
    "--no-owner",
    "--no-privileges",
    "--verbose"
  )

  Write-BackupLog "Running pg_dump for database '$databaseName'."
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    & $pgDumpPath @pgDumpArgs 2>&1 | ForEach-Object {
      Write-BackupLog "pg_dump: $($_.ToString())"
    }
    $pgDumpExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }

  if ($pgDumpExitCode -ne 0) {
    Fail-Backup "pg_dump failed with exit code $pgDumpExitCode."
  }
} finally {
  $env:PGPASSWORD = $previousPgPassword
  $env:PGSSLMODE = $previousPgSslMode
}

if (-not (Test-Path -LiteralPath $backupFile)) {
  Fail-Backup "pg_dump completed but backup file was not created."
}

$backupItem = Get-Item -LiteralPath $backupFile
if ($backupItem.Length -le 0) {
  Fail-Backup "Backup file is empty: $backupFile"
}

Write-BackupLog "File created: $backupFile"
Write-BackupLog "File size bytes: $($backupItem.Length)"

$cutoff = (Get-Date).AddDays(-1 * $RetentionDays)
$deletedCount = 0
Get-ChildItem -LiteralPath $BackupRoot -Filter "bima_*.sql" -File |
  Where-Object { $_.LastWriteTime -lt $cutoff } |
  ForEach-Object {
    Write-BackupLog "Deleting old backup: $($_.FullName)"
    Remove-Item -LiteralPath $_.FullName -Force
    $deletedCount += 1
  }

Write-BackupLog "Retention days: $RetentionDays"
Write-BackupLog "Old backups deleted: $deletedCount"
Write-BackupLog "End time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-BackupLog "Backup completed successfully."

Write-Output "BACKUP OK: $backupFile"
exit 0
