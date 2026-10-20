@echo off
title FMYD ICT Registry - Create Desktop Shortcut
color 0A
echo.
echo ========================================================
echo   Federal Ministry of Youth Development
echo   FMYD ICT Department File Registry
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Creating Desktop Shortcut...
powershell -NoProfile -Command "$wsh = New-Object -ComObject WScript.Shell; $s = $wsh.CreateShortcut([IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'FMYD ICT Registry.lnk')); $s.TargetPath = '%~dp0FMYD-ICT-Registry.exe'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = '%~dp0fmyd-logo.ico'; $s.Description = 'Federal Ministry of Youth Development - ICT File Registry'; $s.Save()"

echo [2/2] Launching FMYD ICT Registry...
start "" "%~dp0FMYD-ICT-Registry.exe"

echo.
echo ========================================================
echo   SUCCESS! The application is now running.
echo   A shortcut "FMYD ICT Registry" has been placed on
echo   your Desktop for daily use.
echo.
echo   Default Login:
echo     Username: admin
echo     Password: admin123
echo ========================================================
echo.
timeout /t 5 >nul
exit
