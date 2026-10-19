@echo off
title FMYD ICT Registry Launcher
echo ========================================================
echo   Starting FMYD ICT Department File Registry
echo ========================================================
echo.

echo Starting Backend API Server (Port 5000)...
start "FMYD Registry - Backend Server" cmd /k "cd /d "%~dp0server" && npm run dev"

timeout /t 3 /nobreak >nul

echo Starting Frontend Web App (Port 3000)...
start "FMYD Registry - Frontend Client" cmd /k "cd /d "%~dp0client" && npm run dev"

echo.
echo ========================================================
echo   Services are starting up!
echo   - Local access:    http://localhost:3000
echo   - LAN access:      http://<your-ip-address>:3000
echo   - Backend API:     http://localhost:5000
echo ========================================================
echo.
pause
