@echo off
setlocal
set "CLEARBRIEF_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%CLEARBRIEF_NODE%" set "CLEARBRIEF_NODE=node"
cd /d "%~dp0"
"%CLEARBRIEF_NODE%" build.mjs
if errorlevel 1 goto failure
"%CLEARBRIEF_NODE%" nebius-local.mjs
:failure
pause
endlocal
