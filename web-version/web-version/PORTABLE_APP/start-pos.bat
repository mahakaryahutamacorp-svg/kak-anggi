@echo off
title M3 Chicken POS Launcher
cd /d "%~dp0"

echo ========================================
echo   M3 Chicken POS - Standalone Launcher
echo ========================================
echo.

REM Jalankan backend autentikasi (SQLite)
set "BACKEND_DIR=%~dp0..\backend"
if exist "%BACKEND_DIR%\server.js" (
  echo [1/2] Menyalakan backend autentikasi...
  start "M3 Chicken Backend" /min cmd /c "cd /d \"%BACKEND_DIR%\" && node server.js"
  timeout /t 2 /nobreak >nul
) else (
  echo [WARN] Backend tidak ditemukan. Login akan memakai mode offline.
)

REM Buka aplikasi desktop
echo [2/2] Membuka M3 Chicken POS...
start "" "%~dp0M3ChickenPOS-win_x64.exe"

echo.
echo Aplikasi berjalan. Tutup jendela ini jika sudah siap.
timeout /t 3 /nobreak >nul
