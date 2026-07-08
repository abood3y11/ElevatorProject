# =============================================================================
# ELMS deploy — Windows wrapper. Runs scripts/deploy-all.sh through Git Bash.
#
#   Right-click -> "Run with PowerShell", or from a terminal:
#     .\scripts\deploy-all.ps1 "commit message"
#     .\scripts\deploy-all.ps1 "msg" --backend-only
#     .\scripts\deploy-all.ps1 -y            # skip the confirmation prompt
# =============================================================================
param([Parameter(ValueFromRemainingArguments = $true)] [string[]] $Args)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$sh   = Join-Path $here 'deploy-all.sh'

# Locate Git Bash.
$bash = $null
foreach ($p in @(
    "$env:ProgramFiles\Git\bin\bash.exe",
    "${env:ProgramFiles(x86)}\Git\bin\bash.exe",
    "$env:LOCALAPPDATA\Programs\Git\bin\bash.exe")) {
  if (Test-Path $p) { $bash = $p; break }
}
if (-not $bash) {
  $cmd = Get-Command bash -ErrorAction SilentlyContinue
  if ($cmd) { $bash = $cmd.Source }
}
if (-not $bash) { Write-Error "Git Bash not found. Install Git for Windows (https://git-scm.com)."; exit 1 }

# Let the bash script skip its own pause; this wrapper pauses instead so the
# window stays open after a double-click.
$env:ELMS_NO_PAUSE = '1'
if ($Args) { & $bash "$sh" @Args } else { & $bash "$sh" }
$code = $LASTEXITCODE

Write-Host ''
if ($code -eq 0) { Write-Host 'Deploy finished.' -ForegroundColor Green }
else { Write-Host "Deploy exited with code $code." -ForegroundColor Red }
Read-Host 'Press Enter to close'
exit $code
