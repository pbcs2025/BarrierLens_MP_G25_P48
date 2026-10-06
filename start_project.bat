@echo off
title BarrierLens P48 Dashboard
echo ====================================================================
echo Starting BarrierLens P48 - Research Dashboard
echo ====================================================================
echo.
echo Opening http://localhost:3000/login.html in your browser...
start http://localhost:3000/login.html
echo.
node server.js
pause
