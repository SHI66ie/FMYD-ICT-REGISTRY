@echo off
:: ============================================================
::  FMYD ICT Registry — Restore from Google Drive Backup
::  Run as Administrator
:: ============================================================
title FMYD ICT Registry - Restore Backup

echo.
echo  ==========================================
echo   FMYD ICT Registry — Restore from Backup
echo  ==========================================
echo.
echo  WARNING: This will overwrite your current local files!
echo.

set /p CONFIRM="Type YES to continue: "
if /i not "%CONFIRM%"=="YES" (
    echo Cancelled.
    pause
    exit /b 0
)

set RESTORE_DIR=%~dp0restore-%date:~-4,4%%date:~-7,2%%date:~-10,2%
mkdir "%RESTORE_DIR%" >nul 2>&1

echo.
echo  [1/2] Downloading latest database dump from Google Drive...
rclone copy gdrive:FMYD-Backup/database/ "%RESTORE_DIR%\database\" --transfers=4
echo  Done. Files saved to: %RESTORE_DIR%\database\

echo.
echo  [2/2] Restoring uploads folder from Google Drive...
set SCRIPT_DIR=%~dp0
for /f "delims=" %%i in ('powershell -Command "(Get-Content '%SCRIPT_DIR%..\server\.env' | Select-String 'UPLOAD_DIR=').Line -replace 'UPLOAD_DIR=','' "') do set UPLOAD_DIR=%%i
if "%UPLOAD_DIR%"=="" set UPLOAD_DIR=uploads

rclone sync gdrive:FMYD-Backup/uploads/ "%SCRIPT_DIR%..\server\%UPLOAD_DIR%\" --transfers=8
echo  Done. Uploads restored.

echo.
echo  ==========================================
echo   Restore Complete!
echo  ==========================================
echo.
echo  Database dump files are at:
echo    %RESTORE_DIR%\database\
echo.
echo  To restore the database, run this command in psql:
echo    psql -U postgres -d fmyd_registry -f ^<dump-file.sql^>
echo.
pause
