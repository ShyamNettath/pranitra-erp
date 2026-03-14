@echo off
title USAHA Deploy — Build EXE
color 1F
echo.
echo  ================================================
echo   USAHA ERP — Building Deploy Tool (.exe)
echo  ================================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Python not found.
    echo  Download from https://www.python.org/downloads/
    pause
    exit /b 1
)

echo  [1/3] Installing dependencies...
python -m pip install pyinstaller paramiko --quiet
if errorlevel 1 (
    echo  ERROR: pip install failed.
    pause
    exit /b 1
)

echo  [2/3] Building USAHA_Deploy.exe ...
python -m PyInstaller --onefile --windowed --name "USAHA_Deploy" --hidden-import=paramiko deploy.py
if errorlevel 1 (
    echo  ERROR: Build failed. See output above.
    pause
    exit /b 1
)

echo.
echo  [3/3] Done!
echo.
echo  ================================================
echo   EXE created at:  dist\USAHA_Deploy.exe
echo   Double-click it to deploy your code!
echo  ================================================
echo.
pause
