@echo off
title Build FMYD ICT Registry Executable
echo ========================================================
echo   Building FMYD ICT Registry Desktop Executable (.exe)
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Building frontend production bundle (Vite)...
cd client
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed.
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo [2/3] Compiling native Windows executable with official FMYD icon...
"C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /target:winexe /out:FMYD-ICT-Registry.exe /win32icon:fmyd-logo.ico /reference:System.dll,System.Drawing.dll,System.Windows.Forms.dll launcher\Program.cs

if %errorlevel% neq 0 (
    echo [ERROR] C# compilation failed.
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Creating Desktop Shortcut...
powershell -NoProfile -Command "$wsh = New-Object -ComObject WScript.Shell; $s = $wsh.CreateShortcut([IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'FMYD ICT Registry.lnk')); $s.TargetPath = '%~dp0FMYD-ICT-Registry.exe'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = '%~dp0fmyd-logo.ico'; $s.Description = 'Federal Ministry of Youth Development - ICT File Registry'; $s.Save()"

echo.
echo ========================================================
echo   BUILD SUCCESSFUL!
echo   Executable: %~dp0FMYD-ICT-Registry.exe
echo   Desktop shortcut created: FMYD ICT Registry
echo ========================================================
echo.
pause
