@echo off
setlocal enabledelayedexpansion
title FMYD ICT Registry - Database Setup

echo ========================================================
echo   FMYD ICT Department File Registry - Database Setup
echo ========================================================
echo.

set /p PG_PASS="Enter your PostgreSQL 'postgres' user password: "

set PGPASSWORD=%PG_PASS%
set PSQL="C:\Program Files\PostgreSQL\18\bin\psql.exe"

if not exist %PSQL% (
    set PSQL=psql
)

echo.
echo [1/3] Creating database 'fmyd_registry' if it doesn't exist...
%PSQL% -U postgres -h localhost -p 5432 -c "CREATE DATABASE fmyd_registry;" 2>nul
if %errorlevel% neq 0 (
    echo Note: Database may already exist or checking credentials...
)

echo [2/3] Applying schema and seed data...
%PSQL% -U postgres -h localhost -p 5432 -d fmyd_registry -f "%~dp0database\schema.sql"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to run schema. Please verify your password.
    pause
    exit /b %errorlevel%
)

echo [3/3] Updating server\.env with your password...
powershell -Command "(Get-Content '%~dp0server\.env') -replace 'DB_PASSWORD=.*', 'DB_PASSWORD=%PG_PASS%' | Set-Content '%~dp0server\.env'"

echo.
echo ========================================================
echo   DATABASE SETUP COMPLETED SUCCESSFULLY!
echo ========================================================
echo Default Admin Login:
echo   Username: admin
echo   Password: admin123
echo.
pause
