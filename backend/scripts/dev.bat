@echo off
echo Starting Forecast Calculator (Development Mode)
echo.

cd /d "%~dp0\.."

:: 가상환경 활성화 (있는 경우)
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

:: 서버 시작
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
