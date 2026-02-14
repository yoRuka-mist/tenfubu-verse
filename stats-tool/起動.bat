@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo ========================================
echo  統計分析ツール 起動
echo ========================================
echo.
echo npm install を実行中...
call npm install
echo.
echo 開発サーバーを起動中...
echo ブラウザで http://localhost:5174 にアクセスしてください
echo.
call npm run dev
pause
