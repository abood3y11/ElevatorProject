@echo off
setlocal

set "PORT=8000"

if "%~1"=="/help" goto help
if "%~1"=="--help" goto help
if "%~1"=="help" goto help
if "%~1"=="/token" goto token
if "%~1"=="/start" goto start
if "%~1"=="" goto start

:help
echo.
echo ELMS ngrok helper
echo Usage:
echo   ELMS-Ngrok.cmd /token YOUR_NGROK_AUTHTOKEN
echo   ELMS-Ngrok.cmd /start
echo.
echo Meta Webhook URL will be:
echo   https://YOUR_NGROK_DOMAIN/webhook
echo or:
echo   https://YOUR_NGROK_DOMAIN/api/v1/webhook
echo.
exit /b 0

:token
if "%~2"=="" (
  echo Missing token.
  echo Usage: ELMS-Ngrok.cmd /token YOUR_NGROK_AUTHTOKEN
  exit /b 1
)
where ngrok >nul 2>nul || (
  echo ngrok was not found. Install it with: npm install -g ngrok
  exit /b 1
)
ngrok config add-authtoken "%~2"
exit /b %ERRORLEVEL%

:start
where ngrok >nul 2>nul || (
  echo ngrok was not found. Install it with: npm install -g ngrok
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:%PORT%/health' -UseBasicParsing -TimeoutSec 5; if ($r.StatusCode -ne 200) { exit 1 } } catch { exit 1 }"
if not "%ERRORLEVEL%"=="0" (
  echo Backend is not reachable on http://localhost:%PORT%/health
  echo Start it first with: ELMS-Launcher.cmd /backend
  exit /b 1
)
echo Starting ngrok for backend port %PORT%...
echo Keep this window open while Meta is using the webhook.
echo.
ngrok http %PORT%
exit /b %ERRORLEVEL%
