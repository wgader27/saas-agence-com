@echo off
title Panel Encore Design — Serveurs de developpement
color 0A
echo.
echo  ============================================
echo   Panel Encore Design - Demarrage serveurs
echo  ============================================
echo.

cd /d "%~dp0"

echo  [0/2] Preparation des dossiers...
mkdir "%~dp0backend\var\sessions" 2>nul
mkdir "%~dp0backend\var\uploads" 2>nul
mkdir "%~dp0backend\var\tmp" 2>nul

echo  [1/2] Demarrage du backend PHP (port 8000)...
start "Backend PHP :8000" cmd /k "cd /d "%~dp0backend" && "C:\Program Files (x86)\PHP\php.exe" -d upload_max_filesize=500M -d post_max_size=510M -d max_file_uploads=30 -d memory_limit=256M -d upload_tmp_dir="%~dp0backend\var\tmp" -S localhost:8000 public/index.php"

timeout /t 2 /nobreak >nul

echo  [2/2] Demarrage du frontend Vite (port 5173)...
start "Frontend Vite :5173" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo  Serveurs demarres !
echo   Backend  -> http://localhost:8000
echo   Frontend -> http://localhost:5173
echo   Adminer  -> http://localhost:8000/adminer.php
echo.
echo  Base de donnees SQLite :
echo   %~dp0backend\var\data_dev.db
echo.
echo  Ouverture du navigateur...
start http://localhost:5173

echo.
echo  Appuyez sur une touche pour fermer cette fenetre.
echo  (Les serveurs continuent de tourner dans leurs fenetres separees)
pause >nul
