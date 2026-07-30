@echo off
setlocal

set "ROOT=%~dp0"
for %%I in ("%ROOT%.") do set "ROOT=%%~fI"

if "%~1"=="/help" goto help
if "%~1"=="--help" goto help
if "%~1"=="help" goto help
if "%~1"=="/backend" goto backend
if "%~1"=="/backend-restart" goto backend_restart
if "%~1"=="/backend-stop" goto backend_stop
if "%~1"=="/admin" goto admin
if "%~1"=="/worker" goto worker
if "%~1"=="/customer" goto customer
if "%~1"=="/all" goto all
if "%~1"=="" goto all

:help
echo.
echo ELMS Launcher
echo Usage:
echo   ELMS-Launcher.cmd          Start all services
echo   ELMS-Launcher.cmd /backend Start backend only
echo   ELMS-Launcher.cmd /backend-restart Stop backend on port 8000, then start it
echo   ELMS-Launcher.cmd /backend-stop Stop backend on port 8000
echo   ELMS-Launcher.cmd /admin   Start AdminPortal only
echo   ELMS-Launcher.cmd /worker  Start mobile-worker Expo only
echo   ELMS-Launcher.cmd /customer Start elms-customer Expo only
echo.
exit /b 0

:all
call :check_tools || exit /b 1
call :backend
timeout /t 2 /nobreak >nul
call :admin
timeout /t 2 /nobreak >nul
call :worker
timeout /t 2 /nobreak >nul
call :customer
echo.
echo ELMS windows are starting.
echo Backend:        http://localhost:8000/docs
echo AdminPortal:    http://localhost:5173
echo Worker Expo:    port 8081
echo Customer Expo:  port 8082
echo.
exit /b 0

:backend
where python >nul 2>nul || (
  echo Python was not found in PATH.
  exit /b 1
)
if not exist "%ROOT%\backend\app\main.py" (
  echo Backend app was not found under "%ROOT%\backend".
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/health' -UseBasicParsing -TimeoutSec 3; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
if "%ERRORLEVEL%"=="0" (
  echo Backend is already running: http://localhost:8000/docs
  echo Use ELMS-Launcher.cmd /backend-restart if it is stuck.
  exit /b 0
)
start "ELMS Backend" cmd /k pushd "%ROOT%\backend" ^&^& python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
exit /b 0

:backend_restart
call :backend_stop
timeout /t 1 /nobreak >nul
call :backend
exit /b %ERRORLEVEL%

:backend_stop
powershell -NoProfile -ExecutionPolicy Bypass -Command "$pids = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if (-not $pids) { Write-Host 'Backend port 8000 is already free.'; exit 0 }; foreach ($processId in $pids) { try { Stop-Process -Id $processId -Force -ErrorAction Stop; Write-Host ('Stopped process on port 8000: ' + $processId) } catch { Write-Host ('Could not stop process on port 8000: ' + $processId + ' - ' + $_.Exception.Message); exit 1 } }"
exit /b %ERRORLEVEL%

:admin
where npm.cmd >nul 2>nul || (
  echo npm.cmd was not found in PATH.
  exit /b 1
)
if not exist "%ROOT%\AdminPortal\package.json" (
  echo AdminPortal package.json was not found.
  exit /b 1
)
start "ELMS AdminPortal" cmd /k pushd "%ROOT%\AdminPortal" ^&^& npm.cmd run dev -- --host 0.0.0.0
exit /b 0

:worker
where npx.cmd >nul 2>nul || (
  echo npx.cmd was not found in PATH.
  exit /b 1
)
if not exist "%ROOT%\mobile-worker\package.json" (
  echo mobile-worker package.json was not found.
  exit /b 1
)
start "ELMS Worker App" cmd /k pushd "%ROOT%\mobile-worker" ^&^& npx.cmd expo start --port 8081 --clear
exit /b 0

:customer
where npx.cmd >nul 2>nul || (
  echo npx.cmd was not found in PATH.
  exit /b 1
)
if not exist "%ROOT%\elms-customer\package.json" (
  echo elms-customer package.json was not found.
  exit /b 1
)
start "ELMS Customer App" cmd /k pushd "%ROOT%\elms-customer" ^&^& npx.cmd expo start --port 8082 --clear
exit /b 0

:check_tools
where python >nul 2>nul || (
  echo Python was not found in PATH.
  exit /b 1
)
where npm.cmd >nul 2>nul || (
  echo npm.cmd was not found in PATH.
  exit /b 1
)
where npx.cmd >nul 2>nul || (
  echo npx.cmd was not found in PATH.
  exit /b 1
)
exit /b 0
