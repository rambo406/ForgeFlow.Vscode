@echo off
REM Wrapper to forward Angular CLI commands to the webview project
SETLOCAL ENABLEDELAYEDEXPANSION

REM Resolve repo root (directory of this script)
set SCRIPT_DIR=%~dp0

REM Change to the Angular webview workspace
pushd "%SCRIPT_DIR%src\webview-angular-v2" >NUL 2>&1
if errorlevel 1 (
  echo [ng.cmd] Error: Could not locate src\webview-angular-v2.>&2
  echo Run Angular commands from the webview directory or via:>&2
  echo    npm run build:webview>&2
  exit /b 1
)

REM Prefer local Angular CLI if installed, fallback to npx
if exist "node_modules\.bin\ng.cmd" (
  call "node_modules\.bin\ng.cmd" %*
) else (
  npx -y @angular/cli@20 %*
)

set EXIT_CODE=%ERRORLEVEL%
popd >NUL 2>&1
exit /b %EXIT_CODE%

