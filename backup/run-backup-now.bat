@echo off
:: ============================================================
::  FMYD ICT Registry — Run Backup Now (manual trigger)
:: ============================================================
title FMYD ICT Registry - Running Backup...

echo.
echo  Starting FMYD ICT Registry backup...
echo  (Check backup\backup.log for details)
echo.

powershell.exe -ExecutionPolicy Bypass -File "%~dp0backup.ps1"

echo.
echo  Done! Check backup.log for the full report.
echo.
pause
