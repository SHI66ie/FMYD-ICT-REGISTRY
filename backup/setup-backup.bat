@echo off
:: ============================================================
::  FMYD ICT Registry — Google Drive Backup Setup
:: ============================================================
title FMYD ICT Registry - Google Drive Setup
cd /d "%~dp0"

echo.
echo  ==========================================
echo   FMYD ICT Registry — Cloud Backup Setup
echo  ==========================================
echo.

:: ─── Step 1: Check for rclone ──────────────────────────────
echo  [1/3] Locating rclone...

set RCLONE_CMD=rclone
where rclone >nul 2>&1
if %errorlevel% equ 0 goto :rclone_found

if exist "%~dp0..\rclone.exe" (
    set "RCLONE_CMD=%~dp0..\rclone.exe"
    goto :rclone_found
)
if exist "%~dp0rclone.exe" (
    set "RCLONE_CMD=%~dp0rclone.exe"
    goto :rclone_found
)
if exist "%LOCALAPPDATA%\Microsoft\WinGet\Packages\Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe\rclone-v1.75.1-windows-amd64\rclone.exe" (
    set "RCLONE_CMD=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Rclone.Rclone_Microsoft.Winget.Source_8wekyb3d8bbwe\rclone-v1.75.1-windows-amd64\rclone.exe"
    goto :rclone_found
)

echo  rclone not found locally. Downloading portable rclone...
powershell -Command "Invoke-WebRequest -Uri 'https://downloads.rclone.org/rclone-current-windows-amd64.zip' -OutFile '%TEMP%\rclone.zip' -UseBasicParsing"
if %errorlevel% neq 0 (
    echo  [ERROR] Failed to download rclone. Please check your internet connection.
    pause
    exit /b 1
)
powershell -Command "Expand-Archive -Path '%TEMP%\rclone.zip' -DestinationPath '%TEMP%\rclone-extracted' -Force"
powershell -Command "Copy-Item (Get-ChildItem '%TEMP%\rclone-extracted' -Recurse -Filter 'rclone.exe' | Select-Object -First 1 -ExpandProperty FullName) '%~dp0..\rclone.exe' -Force"
set "RCLONE_CMD=%~dp0..\rclone.exe"

:rclone_found
echo  Using rclone: %RCLONE_CMD%

:: ─── Step 2: Configure Google Drive ──────────────────────
echo.
echo  [2/3] Connecting Google Drive account...
echo.
echo  ┌────────────────────────────────────────────────────────┐
echo  │  Your default web browser will open in a moment.       │
echo  │  1. Log into your Google account in the browser.       │
echo  │  2. Click 'Allow' to grant rclone access.              │
echo  │  3. Return to this window once completed.              │
echo  └────────────────────────────────────────────────────────┘
echo.

"%RCLONE_CMD%" config create gdrive drive scope=drive

echo.
echo  [3/3] Verifying Google Drive connection...
"%RCLONE_CMD%" lsd gdrive: >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [WARNING] Could not immediately verify connection.
    echo  Attempting reconnect...
    "%RCLONE_CMD%" config reconnect gdrive:
)

"%RCLONE_CMD%" lsd gdrive: >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo  SUCCESS! Google Drive is now connected.
    echo  Creating backup directory...
    "%RCLONE_CMD%" mkdir gdrive:FMYD-Backup/database >nul 2>&1
    "%RCLONE_CMD%" mkdir gdrive:FMYD-Backup/uploads >nul 2>&1
    echo  Directory 'FMYD-Backup' is ready.
) else (
    echo.
    echo  [ERROR] Google Drive connection was not completed.
    echo  Please make sure you granted permissions in the browser.
)

echo.
echo  Press any key to close this window...
pause >nul
