# ============================================================
#  FMYD ICT Registry — Automatic Cloud Backup Script
#  Backs up:
#    1. PostgreSQL database  → Google Drive:/FMYD-Backup/database/
#    2. Uploaded files       → Google Drive:/FMYD-Backup/uploads/
#
#  Requirements:
#    - rclone configured with a remote named "gdrive" (run setup-backup.bat first)
#    - pg_dump available (comes with PostgreSQL installation)
# ============================================================

# ─── Config ──────────────────────────────────────────────────
$ScriptDir    = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectRoot  = Split-Path -Parent $ScriptDir

# Load .env from server folder
$EnvFile = Join-Path $ProjectRoot "server\.env"
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "fmyd_registry"
$DB_USER = "postgres"
$DB_PASSWORD = "postgres"
$UPLOAD_DIR  = "uploads"

if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            $key   = $matches[1].Trim()
            $value = $matches[2].Trim()
            switch ($key) {
                "DB_HOST"     { $DB_HOST     = $value }
                "DB_PORT"     { $DB_PORT     = $value }
                "DB_NAME"     { $DB_NAME     = $value }
                "DB_USER"     { $DB_USER     = $value }
                "DB_PASSWORD" { $DB_PASSWORD = $value }
                "UPLOAD_DIR"  { $UPLOAD_DIR  = $value }
            }
        }
    }
}

$UploadsPath  = Join-Path $ProjectRoot "server\$UPLOAD_DIR"
$DumpDir      = Join-Path $ScriptDir "db-dumps"
$LogFile      = Join-Path $ScriptDir "backup.log"
$Timestamp    = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$DumpFile     = Join-Path $DumpDir "fmyd_registry_$Timestamp.sql"

# Google Drive remote name (set during rclone config)
$GDriveRemote = "gdrive"
$GDriveFolder = "FMYD-Backup"

# ─── Helpers ─────────────────────────────────────────────────
function Log($msg) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line
}

function Check-Internet {
    try {
        $null = Test-Connection -ComputerName "8.8.8.8" -Count 1 -Quiet -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# ─── Start ───────────────────────────────────────────────────
Log "========================================"
Log "FMYD ICT Registry Backup Started"
Log "========================================"

# Check internet connectivity
if (-not (Check-Internet)) {
    Log "⚠️  No internet connection detected. Backup skipped — will retry next run."
    exit 0
}

Log "✅ Internet connection confirmed."

# Ensure dump directory exists
if (-not (Test-Path $DumpDir)) {
    New-Item -ItemType Directory -Path $DumpDir | Out-Null
}

# ─── Step 1: PostgreSQL Database Dump ────────────────────────
Log "📦 Starting database dump..."

# Find pg_dump
$pgDump = Get-Command "pg_dump" -ErrorAction SilentlyContinue
if (-not $pgDump) {
    # Try common PostgreSQL install paths
    $pgPaths = @(
        "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe"
    )
    foreach ($p in $pgPaths) {
        if (Test-Path $p) { $pgDump = $p; break }
    }
}

if (-not $pgDump) {
    Log "❌ pg_dump not found. Please ensure PostgreSQL is installed."
    exit 1
}

$env:PGPASSWORD = $DB_PASSWORD
$pgDumpCmd = if ($pgDump -is [System.Management.Automation.ApplicationInfo]) { $pgDump.Source } else { $pgDump }

& $pgDumpCmd -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -F p -f $DumpFile 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0 -and (Test-Path $DumpFile)) {
    $sizeMB = [math]::Round((Get-Item $DumpFile).Length / 1MB, 2)
    Log "✅ Database dumped successfully → $DumpFile ($sizeMB MB)"
} else {
    Log "❌ Database dump failed (exit code: $LASTEXITCODE)"
    exit 1
}

# ─── Step 2: Upload DB Dump to Google Drive ──────────────────
Log "☁️  Uploading database dump to Google Drive..."

$rclone = Get-Command "rclone" -ErrorAction SilentlyContinue
if (-not $rclone) {
    Log "❌ rclone not found. Please install rclone and run setup-backup.bat first."
    exit 1
}

& rclone copy $DumpFile "${GDriveRemote}:${GDriveFolder}/database/" --transfers=4 --retries=3 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Log "✅ Database dump uploaded to Google Drive"
} else {
    Log "❌ Failed to upload database dump (rclone exit: $LASTEXITCODE)"
}

# ─── Step 3: Sync Uploads Folder to Google Drive ─────────────
Log "📁 Syncing uploads folder to Google Drive..."

if (Test-Path $UploadsPath) {
    & rclone sync $UploadsPath "${GDriveRemote}:${GDriveFolder}/uploads/" --transfers=8 --retries=3 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Log "✅ Uploads folder synced to Google Drive"
    } else {
        Log "❌ Failed to sync uploads folder (rclone exit: $LASTEXITCODE)"
    }
} else {
    Log "⚠️  Uploads folder not found at: $UploadsPath — skipping."
}

# ─── Step 4: Cleanup Old Local Dumps (keep last 7) ───────────
Log "🧹 Cleaning up old local database dumps (keeping last 7)..."
$dumps = Get-ChildItem $DumpDir -Filter "*.sql" | Sort-Object LastWriteTime -Descending
if ($dumps.Count -gt 7) {
    $dumps | Select-Object -Skip 7 | ForEach-Object {
        Remove-Item $_.FullName -Force
        Log "   Removed old dump: $($_.Name)"
    }
}

Log "========================================"
Log "✅ Backup completed successfully!"
Log "   Google Drive folder: $GDriveFolder/"
Log "     ├── database/  (SQL dumps)"
Log "     └── uploads/   (scanned files)"
Log "========================================"
