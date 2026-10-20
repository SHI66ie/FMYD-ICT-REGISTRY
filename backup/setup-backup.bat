@echo off
:: ============================================================
::  FMYD ICT Registry — One-Time Backup Setup
::  Run this ONCE to install rclone and connect Google Drive
:: ============================================================
title FMYD ICT Registry - Backup Setup

echo.
echo  ==========================================
echo   FMYD ICT Registry — Cloud Backup Setup
echo  ==========================================
echo.
echo  This will:
echo    1. Download and install rclone (free)
echo    2. Connect your Google Drive account
echo    3. Register an automatic backup task
echo.
pause

:: ─── Check for admin rights ───────────────────────────────
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Please run this script as Administrator.
    echo  Right-click setup-backup.bat and choose "Run as administrator"
    echo.
    pause
    exit /b 1
)

:: ─── Step 1: Download rclone ──────────────────────────────
echo.
echo  [1/4] Checking for rclone...
where rclone >nul 2>&1
if %errorlevel% equ 0 (
    echo  rclone is already installed. Skipping download.
    goto :configure_gdrive
)

echo  Downloading rclone...
set RCLONE_DIR=%ProgramFiles%\rclone
if not exist "%RCLONE_DIR%" mkdir "%RCLONE_DIR%"

powershell -Command "Invoke-WebRequest -Uri 'https://downloads.rclone.org/rclone-current-windows-amd64.zip' -OutFile '%TEMP%\rclone.zip' -UseBasicParsing"
if %errorlevel% neq 0 (
    echo  [ERROR] Failed to download rclone. Check your internet connection.
    pause
    exit /b 1
)

powershell -Command "Expand-Archive -Path '%TEMP%\rclone.zip' -DestinationPath '%TEMP%\rclone-extracted' -Force"
powershell -Command "Copy-Item (Get-ChildItem '%TEMP%\rclone-extracted' -Recurse -Filter 'rclone.exe' | Select-Object -First 1 -ExpandProperty FullName) '%RCLONE_DIR%\rclone.exe' -Force"

:: Add rclone to system PATH
setx /M PATH "%PATH%;%RCLONE_DIR%" >nul 2>&1
set PATH=%PATH%;%RCLONE_DIR%

echo  rclone installed at: %RCLONE_DIR%\rclone.exe

:: ─── Step 2: Configure Google Drive ──────────────────────
:configure_gdrive
echo.
echo  [2/4] Connecting Google Drive...
echo.
echo  ┌──────────────────────────────────────────────────────┐
echo  │  A browser window will open asking you to log in    │
echo  │  to Google. Please sign in with the Google account  │
echo  │  you want to use for backups.                        │
echo  │                                                      │
echo  │  When asked for a remote name, type:  gdrive         │
echo  │  When asked for storage type, choose: Google Drive   │
echo  │  For all other settings, press Enter (use defaults)  │
echo  │  When asked "Use auto config?" type:  y              │
echo  └──────────────────────────────────────────────────────┘
echo.
pause

rclone config create gdrive drive scope=drive >nul 2>&1
rclone config reconnect gdrive:

echo.
echo  [3/4] Testing Google Drive connection...
rclone lsd gdrive: >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Could not connect to Google Drive.
    echo  Please re-run this setup and follow the login steps carefully.
    pause
    exit /b 1
)
echo  Google Drive connected successfully!

:: ─── Step 3: Create backup folder on Google Drive ────────
echo.
echo  Creating FMYD-Backup folder on Google Drive...
rclone mkdir gdrive:FMYD-Backup/database
rclone mkdir gdrive:FMYD-Backup/uploads
echo  Folders created.

:: ─── Step 4: Register Windows Task Scheduler ─────────────
echo.
echo  [4/4] Registering automatic backup task...

set SCRIPT_DIR=%~dp0
set PS_SCRIPT=%SCRIPT_DIR%backup.ps1

:: Remove existing task if it exists
schtasks /delete /tn "FMYD-ICT-Registry-Backup" /f >nul 2>&1

:: Create task: runs every 1 hour, starts at next logon
schtasks /create ^
  /tn "FMYD-ICT-Registry-Backup" ^
  /tr "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%PS_SCRIPT%\"" ^
  /sc HOURLY ^
  /mo 1 ^
  /ru "%USERNAME%" ^
  /rl HIGHEST ^
  /f

if %errorlevel% equ 0 (
    echo  Backup task registered! Runs every hour automatically.
) else (
    echo  [WARNING] Could not register scheduled task automatically.
    echo  You can still run backup.ps1 manually.
)

echo.
echo  ==========================================
echo   Setup Complete!
echo  ==========================================
echo.
echo  What was configured:
echo    * rclone connected to your Google Drive
echo    * Backup folder: "FMYD-Backup" in Google Drive
echo    * Auto backup: every 1 hour (when online)
echo    * Manual backup: double-click run-backup-now.bat
echo.
echo  Your Google Drive will contain:
echo    FMYD-Backup/
echo      database/   ^<-- PostgreSQL .sql dumps
echo      uploads/    ^<-- Scanned files (JPG/PNG/PDF)
echo.
pause
