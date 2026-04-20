@echo off
cd /d "d:\WEB DEVLOPMENT\ai-boutique-studio"
echo === AI Boutique Studio - Git Status ===
echo.
echo --- Remote Configuration ---
git remote -v
echo.
echo --- Current Branch ---
git branch -a
echo.
echo --- Recent Commits ---
git log --oneline -5
echo.
echo --- Commit Status ---
git status -s
echo.
echo ✓ Git operations completed successfully!
pause
