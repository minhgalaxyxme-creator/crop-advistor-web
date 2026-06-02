@echo off
cd /d "%~dp0"

python -c "import flask" >nul 2>nul
if errorlevel 1 (
  echo Flask chua duoc cai dat.
  echo Chay lenh nay truoc:
  echo python -m pip install -r requirements.txt
  pause
  exit /b 1
)

if "%GEMINI_API_KEY%"=="" (
  echo Chua co GEMINI_API_KEY trong bien moi truong.
  set /p GEMINI_API_KEY=Nhap Gemini API key roi nhan Enter: 
)

if "%GEMINI_API_KEY%"=="" (
  echo Ban chua nhap API key.
  pause
  exit /b 1
)

echo.
echo Server dang chay tai: http://127.0.0.1:5000
echo Hay mo dia chi tren trong trinh duyet.
echo Nhan Ctrl+C de dung server.
echo.
python server.py
