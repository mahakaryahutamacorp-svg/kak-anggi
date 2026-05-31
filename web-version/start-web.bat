@echo off
title M3 Chicken POS - Browser Mode
cd /d "%~dp0"

echo ========================================
echo   M3 Chicken POS - Mode Browser
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
  echo [1/2] Menginstall dependensi backend...
  call npm install --prefix "%~dp0backend"
  if errorlevel 1 (
    echo [ERROR] Gagal install dependensi.
    pause
    exit /b 1
  )
)

echo [2/2] Menyalakan server dan membuka browser...
start "" "http://localhost:3000"
cd /d "%~dp0backend"
node server.js
