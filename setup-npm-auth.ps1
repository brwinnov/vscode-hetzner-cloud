#!/usr/bin/env pwsh
# setup-npm-auth.ps1
# This script stores your GitHub token locally for npm package publishing

param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubToken
)

Write-Host "🔐 Setting up GitHub Packages authentication..." -ForegroundColor Cyan

# Create/update .npmrc with the token
$npmrcPath = "$PSScriptRoot\.npmrc"
$npmrcContent = @"
@brwinnov:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=$GitHubToken
"@

Set-Content -Path $npmrcPath -Value $npmrcContent -Force
Write-Host "✅ Token stored in: $npmrcPath" -ForegroundColor Green
Write-Host "📝 This file is in .gitignore and won't be committed" -ForegroundColor Yellow

# Verify it works
Write-Host "`n🧪 Testing authentication..." -ForegroundColor Cyan
npm whoami --registry https://npm.pkg.github.com 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Authentication successful!" -ForegroundColor Green
    Write-Host "`n📦 You can now run: npm publish" -ForegroundColor Cyan
} else {
    Write-Host "❌ Authentication failed. Check your token." -ForegroundColor Red
}
