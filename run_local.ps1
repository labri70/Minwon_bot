$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

Write-Host "Starting Samsung Minwon Bot at http://127.0.0.1:4173/index.html"
node .\server.js
