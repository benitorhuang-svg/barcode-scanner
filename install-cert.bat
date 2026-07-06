@echo off
echo ==============================================
echo Installing local SSL certificate...
echo Please click YES on the Windows Security prompt.
echo ==============================================
.\mkcert.exe -install
echo.
echo Done! Certificate installed successfully.
echo Please close this window and reply in the chat.
pause
