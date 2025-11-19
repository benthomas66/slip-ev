@echo off
REM Change to this script's directory
cd /d "%~dp0"

echo === Updating NBA projections from nba_api ===
python fetch_projections_nba_api.py
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] fetch_projections_nba_api.py failed.
    pause
    exit /b %errorlevel%
)

echo.
echo === Regenerating src\projections.ts ===
python generate_projections_ts.py
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] generate_projections_ts.py failed.
    pause
    exit /b %errorlevel%
)

echo.
echo Done. Projections updated successfully.
pause
