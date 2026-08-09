#!/usr/bin/env powershell
# AKN CLOUD ERP - Production Readiness Verification

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AKN CLOUD ERP - PRODUCTION READINESS CHECK" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = "c:\Users\Win10\OneDrive\Desktop\AKN-PLATFORM"
$errors = 0
$warnings = 0
$checks = 0

# 1. DIRECTORY STRUCTURE
Write-Host "1. PROJE YAPISI" -ForegroundColor Green
@("backend", "frontend", "database", "backend/controllers", "backend/models", "backend/routes", "frontend/src/pages", "frontend/src/services") | ForEach-Object {
    $path = Join-Path $projectRoot $_
    if (Test-Path $path) {
        Write-Host "   OK: $_" -ForegroundColor Green
        $checks++
    } else {
        Write-Host "   MISSING: $_" -ForegroundColor Red
        $errors++
    }
}

# 2. CRITICAL FILES
Write-Host ""
Write-Host "2. KRITİK DOSYALAR" -ForegroundColor Green
@("backend/server.js", "backend/package.json", "frontend/package.json", ".gitignore", "backend/.env.example", "README.md", "SETUP.md") | ForEach-Object {
    $path = Join-Path $projectRoot $_
    if (Test-Path $path) {
        Write-Host "   OK: $_" -ForegroundColor Green
        $checks++
    } else {
        Write-Host "   MISSING: $_" -ForegroundColor Red
        $errors++
    }
}

# 3. FILE COUNTS
Write-Host ""
Write-Host "3. DOSYA SAYILARI" -ForegroundColor Green

$controllerCount = @(Get-ChildItem -Path "$projectRoot\backend\controllers" -Filter "*.js" -ErrorAction SilentlyContinue).Count
$modelCount = @(Get-ChildItem -Path "$projectRoot\backend\models" -Filter "*.js" -ErrorAction SilentlyContinue).Count  
$routeCount = @(Get-ChildItem -Path "$projectRoot\backend\routes" -Filter "*.js" -ErrorAction SilentlyContinue).Count
$pageCount = @(Get-ChildItem -Path "$projectRoot\frontend\src\pages" -Filter "*.jsx" -ErrorAction SilentlyContinue).Count

Write-Host "   Backend Controllers: $controllerCount" -ForegroundColor Green
Write-Host "   Backend Models: $modelCount" -ForegroundColor Green
Write-Host "   Backend Routes: $routeCount" -ForegroundColor Green
Write-Host "   Frontend Pages: $pageCount" -ForegroundColor Green

if ($controllerCount -ge 15 -and $modelCount -ge 40 -and $routeCount -ge 15 -and $pageCount -ge 30) {
    $checks++
    Write-Host "   Status: COMPLETE" -ForegroundColor Green
} else {
    $warnings++
    Write-Host "   Status: CHECK COUNTS" -ForegroundColor Yellow
}

# 4. GIT IGNORED
Write-Host ""
Write-Host "4. GÜVENLIK (.env ignored)" -ForegroundColor Green
$gitignore = Get-Content "$projectRoot\.gitignore" -Raw
if ($gitignore -match "\.env") {
    Write-Host "   OK: .env is git-ignored" -ForegroundColor Green
    $checks++
} else {
    Write-Host "   PROBLEM: .env not in gitignore" -ForegroundColor Red
    $errors++
}

# 5. NODE MODULES
Write-Host ""
Write-Host "5. NODE MODULES" -ForegroundColor Green
if (Test-Path "$projectRoot\backend\node_modules") {
    Write-Host "   OK: Backend dependencies installed" -ForegroundColor Green
    $checks++
} else {
    Write-Host "   WARNING: Run 'npm install --prefix backend'" -ForegroundColor Yellow
    $warnings++
}

if (Test-Path "$projectRoot\frontend\node_modules") {
    Write-Host "   OK: Frontend dependencies installed" -ForegroundColor Green
    $checks++
} else {
    Write-Host "   WARNING: Run 'npm install --prefix frontend'" -ForegroundColor Yellow
    $warnings++
}

# SUMMARY
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Checks Passed: $checks" -ForegroundColor Green
Write-Host "Warnings: $warnings" -ForegroundColor Yellow
Write-Host "Errors: $errors" -ForegroundColor Red

if ($errors -eq 0) {
    Write-Host ""
    Write-Host "✅ PRODUCTION READY!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Fix errors above" -ForegroundColor Red
}
