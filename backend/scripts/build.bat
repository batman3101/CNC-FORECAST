@echo off
echo ====================================
echo  Forecast Calculator Build Script
echo ====================================
echo.

cd /d "%~dp0\.."

echo [1/4] Installing dependencies...
pip install -r requirements.txt

echo.
echo [2/4] Building frontend...
cd ..\frontend
call npm install
call npm run build

echo.
echo [3/4] Copying frontend build...
xcopy /E /Y dist ..\backend\static\

echo.
echo [4/4] Building executable...
cd ..\backend
pyinstaller build.spec --clean

echo.
echo ====================================
echo  Build Complete!
echo  Output: dist/ForecastCalculator.exe
echo ====================================
pause
