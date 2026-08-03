$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

Write-Host "Starting Nuxt Samsung Minwon Bot at http://127.0.0.1:3000/"
npm.cmd run dev
