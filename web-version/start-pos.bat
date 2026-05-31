@echo off
title M3 Chicken POS Launcher
cd /d "%~dp0"

echo ========================================
echo   M3 Chicken POS - Desktop Launcher
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js belum terinstall.
  echo Unduh dari https://nodejs.org lalu jalankan ulang.
  pause
  exit /b 1
)

if not exist "%~dp0backend\node_modules" (
  echo [0/3] Menginstall dependensi backend...
  call npm install --prefix "%~dp0backend"
  if errorlevel 1 (
    echo [ERROR] Gagal install dependensi.
    pause
    exit /b 1
  )
)

if exist "%~dp0backend\server.js" (
  echo [1/3] Menyalakan backend autentikasi...
  start "M3 Chicken Backend" /min cmd /c "cd /d \"%~dp0backend\" && node server.js"
  timeout /t 2 /nobreak >nul
) else (
  echo [WARN] Backend tidak ditemukan. Login akan memakai mode offline.
)

if exist "%~dp0PORTABLE_APP\M3ChickenPOS-win_x64.exe" (
  echo [2/3] Membuka aplikasi desktop M3 Chicken POS...
  start "" "%~dp0PORTABLE_APP\M3ChickenPOS-win_x64.exe"
) else (
  echo [WARN] Aplikasi desktop tidak ditemukan. Membuka mode browser...
  start "" "http://localhost:3000"
)

echo [3/3] Selesai. Tutup jendela ini jika sudah siap.
timeout /t 3 /nobreak >nul
