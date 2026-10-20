@echo off
title FMYD ICT Registry - First-Time Setup
color 0A
echo.
echo  =========================================================
echo    FMYD ICT Registry - First-Time Setup Wizard
echo    Federal Ministry of Youth Development
echo  =========================================================
echo.

cd /d "%~dp0"

:: ─── Check Admin Rights ────────────────────────────────────────
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Please right-click SETUP.bat and choose "Run as Administrator"
    echo.
    pause
    exit /b 1
)

echo  [Step 1] Checking if Node.js is installed...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo  [OK] Node.js is already installed.
) else (
    echo  [!] Node.js not found. Please install Node.js first:
    echo      1. Go to: https://nodejs.org
    echo      2. Download the LTS version
    echo      3. Install it, then re-run this SETUP.bat
    echo.
    start "" "https://nodejs.org"
    pause
    exit /b 1
)

echo.
echo  [Step 2] Checking if PostgreSQL is installed...
if exist "C:\Program Files\PostgreSQL\18\bin\psql.exe" (
    echo  [OK] PostgreSQL 18 found.
    set PSQL="C:\Program Files\PostgreSQL\18\bin\psql.exe"
    set PGBIN="C:\Program Files\PostgreSQL\18\bin"
) else if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" (
    echo  [OK] PostgreSQL 17 found.
    set PSQL="C:\Program Files\PostgreSQL\17\bin\psql.exe"
    set PGBIN="C:\Program Files\PostgreSQL\17\bin"
) else if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" (
    echo  [OK] PostgreSQL 16 found.
    set PSQL="C:\Program Files\PostgreSQL\16\bin\psql.exe"
    set PGBIN="C:\Program Files\PostgreSQL\16\bin"
) else (
    echo.
    echo  [!] PostgreSQL not found.
    echo      Please install PostgreSQL:
    echo      1. Run the installer included in the Downloads folder
    echo         or go to: https://www.postgresql.org/download/windows/
    echo      2. During install, remember your postgres user password
    echo      3. Then re-run this SETUP.bat
    echo.
    pause
    exit /b 1
)

echo.
echo  [Step 3] Setting up the database...
echo.
echo  IMPORTANT: You need your PostgreSQL password (set during PostgreSQL install).
echo  Default password is usually: postgres
echo.
set /p PGPASSWORD_INPUT=  Enter your PostgreSQL password: 

set PGPASSWORD=%PGPASSWORD_INPUT%

echo.
echo  Creating database "fmyd_registry"...
%PSQL% -U postgres -c "CREATE DATABASE fmyd_registry;" 2>nul
if %errorlevel% neq 0 (
    echo  [OK] Database may already exist, continuing...
)

echo  Applying database schema and creating admin user...
%PSQL% -U postgres -d fmyd_registry -f "database\schema.sql"
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Database setup failed. Check your PostgreSQL password and try again.
    pause
    exit /b 1
)
echo  [OK] Database ready.

echo.
echo  [Step 4] Updating server configuration...
(
echo PORT=5000
echo DB_HOST=localhost
echo DB_PORT=5432
echo DB_NAME=fmyd_registry
echo DB_USER=postgres
echo DB_PASSWORD=%PGPASSWORD_INPUT%
echo JWT_SECRET=fmyd_ict_registry_secret_key_2024
echo UPLOAD_DIR=uploads
) > "server\.env"
echo  [OK] Configuration saved.

echo.
echo  [Step 5] Creating Desktop Shortcut...
powershell -NoProfile -Command "$wsh = New-Object -ComObject WScript.Shell; $s = $wsh.CreateShortcut([IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'FMYD ICT Registry.lnk')); $s.TargetPath = '%~dp0FMYD-ICT-Registry.exe'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = '%~dp0fmyd-logo.ico'; $s.Description = 'Federal Ministry of Youth Development - ICT File Registry'; $s.Save()"
echo  [OK] Desktop shortcut created.

echo.
echo  [Step 6] Google Drive Backup (Optional)
echo.
echo  To enable automatic backup to Google Drive:
echo    Right-click the tray icon (bottom-right) after opening
echo    the app, then click "Setup Google Drive Backup"
echo.
echo    OR run: backup\setup-backup.bat (as Administrator)
echo.
echo  =========================================================
echo    SETUP COMPLETE!
echo.
echo    Default Login:
echo      Username: admin
echo      Password: admin123
echo.
echo    To start the app: double-click "FMYD ICT Registry"
echo    on your Desktop.
echo.
echo    Google Drive Backup: right-click tray icon after launch
echo  =========================================================
echo.
pause
