# ============================================================
#  FMYD ICT Registry — Automatic Cloud Backup Script
#  Backs up:
#    1. SQLite database      → Google Drive:/FMYD-Backup/database/
#    2. Uploaded files       → Google Drive:/FMYD-Backup/uploads/
#
#  Requirements:
#    - rclone configured with a remote named "gdrive" (run setup-backup.bat first)
# ============================================================

# ─── Config ──────────────────────────────────────────────────
$ScriptDir    = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectRoot  = Split-Path -Parent $ScriptDir

# Load .env from server folder if present
$EnvFile = Join-Path $ProjectRoot "server\.env"
$UPLOAD_DIR  = "uploads"
$DATA_DIR    = "data"

if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            $key   = $matches[1].Trim()
            $value = $matches[2].Trim()
            switch ($key) {
                "UPLOAD_DIR"  { $UPLOAD_DIR  = $value }
                "DATA_DIR"    { $DATA_DIR    = $value }
            }
        }
    }
}

$DbPath       = Join-Path $ProjectRoot "server\$DATA_DIR\fmyd_registry.db"
$UploadsPath  = Join-Path $ProjectRoot "server\$UPLOAD_DIR"
$DumpDir      = Join-Path $ScriptDir "db-dumps"
$LogFile      = Join-Path $ScriptDir "backup.log"
$Timestamp    = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$SnapshotFile = Join-Path $DumpDir "fmyd_registry_$Timestamp.db"

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

# ─── Step 1: SQLite Database Snapshot ────────────────────────
Log "📦 Starting database snapshot..."

if (-not (Test-Path $DbPath)) {
    Log "❌ Database file not found at: $DbPath"
    exit 1
}

# Safely copy SQLite DB file snapshot
try {
    Copy-Item -Path $DbPath -Destination $SnapshotFile -Force
    $sizeMB = [math]::Round((Get-Item $SnapshotFile).Length / 1MB, 2)
    Log "✅ Database snapshot created successfully → $SnapshotFile ($sizeMB MB)"
} catch {
    Log "❌ Database snapshot failed: $_"
    exit 1
}

# ─── Step 2: Upload DB Snapshot to Google Drive ──────────────
Log "☁️  Uploading database snapshot to Google Drive..."

$rclone = Get-Command "rclone" -ErrorAction SilentlyContinue
if (-not $rclone) {
    Log "❌ rclone not found. Please install rclone and run setup-backup.bat first."
    exit 1
}

& rclone copy $SnapshotFile "${GDriveRemote}:${GDriveFolder}/database/" --transfers=4 --retries=3 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Log "✅ Database snapshot uploaded to Google Drive"
} else {
    Log "❌ Failed to upload database snapshot (rclone exit: $LASTEXITCODE)"
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
$dumps = Get-ChildItem $DumpDir -Filter "*.db" | Sort-Object LastWriteTime -Descending
if ($dumps.Count -gt 7) {
    $dumps | Select-Object -Skip 7 | ForEach-Object {
        Remove-Item $_.FullName -Force
        Log "   Removed old dump: $($_.Name)"
    }
}

Log "========================================"
Log "✅ Backup completed successfully!"
Log "   Google Drive folder: $GDriveFolder/"
Log "     ├── database/  (SQLite database snapshots)"
Log "     └── uploads/   (scanned files)"
Log "========================================"
