@echo off
echo ============================================
echo  Boiler Management System - Deploy to Vercel
echo ============================================
echo.

REM Step 1: Clean git state
if exist .git rmdir /s /q .git 2>nul
echo [1/4] Initializing git repository...
git init
git branch -M main

REM Step 2: Stage all files
echo [2/4] Staging all files...
git add -A

REM Step 3: Commit
echo [3/4] Committing...
git commit -m "Executive Dashboard + Settings + Pricing Config"

REM Step 4: Force push to Vercel
echo [4/4] Pushing to GitHub (Vercel auto-deploys)...
git push --force https://github.com/Ogombe/boiler-mgmt.git main

echo.
echo ============================================
echo  Deploy complete! Check Vercel dashboard.
echo ============================================
echo.
echo NOTE: Run the SQL on Neon first if you haven't!
echo   See neon-pricing-tables.sql
pause
