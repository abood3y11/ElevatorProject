@echo off
setlocal

set "ROOT=%~dp0"
for %%I in ("%ROOT%.") do set "ROOT=%%~fI"

echo.
echo ELMS local Windows setup
echo This uses the local Python installation directly. No backend venv is created.
echo.

where python >nul 2>nul || (
  echo Python was not found in PATH.
  exit /b 1
)

where npm.cmd >nul 2>nul || (
  echo npm.cmd was not found in PATH.
  exit /b 1
)

echo Installing backend Python requirements with local Python...
pushd "%ROOT%\backend" || exit /b 1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if errorlevel 1 exit /b 1
popd

echo Installing AdminPortal packages...
pushd "%ROOT%\AdminPortal" || exit /b 1
npm.cmd install
if errorlevel 1 exit /b 1
popd

echo Installing mobile-worker packages...
pushd "%ROOT%\mobile-worker" || exit /b 1
npm.cmd install
if errorlevel 1 exit /b 1
popd

echo Installing elms-customer packages...
pushd "%ROOT%\elms-customer" || exit /b 1
npm.cmd install
if errorlevel 1 exit /b 1
popd

echo.
echo Setup completed. Run ELMS-Launcher.cmd or dist\ELMS-Launcher.exe.
echo.
exit /b 0
