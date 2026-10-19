@echo off
title FMYD ICT Registry Launcher
echo ========================================================
echo   Starting FMYD ICT Department File Registry
echo ========================================================
echo.

echo [1/3] Ensuring PostgreSQL database service is running...
net start postgresql-x64-18 >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting PostgreSQL directly via pg_ctl...
    "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\18\data" -l "C:\Program Files\PostgreSQL\18\data\logfile.txt" >nul 2>&1
)

echo [2/3] Starting Backend API Server (Port 5000)...
start "FMYD Registry - Backend Server" cmd /k "cd /d "%~dp0server" && npm run dev"

timeout /t 3 /nobreak >nul

echo [3/3] Starting Frontend Web App (Port 3000)...
start "FMYD Registry - Frontend Client" cmd /k "cd /d "%~dp0client" && npm run dev"

echo.
echo ========================================================
echo   All systems are live!
echo   - Local access:    http://localhost:3000
echo   - Backend API:     http://localhost:5000
echo   - Default Login:   admin / admin123
echo ========================================================
echo.
pause
