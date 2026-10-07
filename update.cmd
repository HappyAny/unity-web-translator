@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0update.ps1" %*
if errorlevel 1 (
  echo Update failed. No browser extension was installed or removed.
  pause
  exit /b 1
)
pause
