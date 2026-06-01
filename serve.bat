@echo off
REM Simple local server launcher for Windows
REM Runs PHP built-in server rooted at public_html
set ROOT=%~dp0
cd /d "%ROOT%"\public_html
php -S localhost:8000 -t ..
