# ============================================================================
#  ELMS Project - Claude Code Skills Installer (PowerShell / Windows)
#  Source repo: https://github.com/alirezarezvani/claude-skills
#
#  Installs only the curated skills needed for the ELMS project.
#
#  Usage (open PowerShell in project root):
#    powershell -ExecutionPolicy Bypass -File .\scripts\install-skills.ps1
#
#  After installation, restart Claude Code and run:  /skills
# ============================================================================

$ErrorActionPreference = "Stop"

# ---- configuration ---------------------------------------------------------
$RepoUrl    = "https://github.com/alirezarezvani/claude-skills.git"
$SkillsDir  = Join-Path $env:USERPROFILE ".claude\skills"
$TmpDir     = Join-Path $env:TEMP ("claude-skills-" + [guid]::NewGuid().ToString("N").Substring(0,8))

# Curated list for ELMS
$Skills = @(
    "engineering-team/skills/senior-frontend",
    "engineering-team/skills/senior-backend",
    "engineering-team/skills/senior-fullstack",
    "engineering-team/skills/senior-architect",
    "engineering-team/skills/senior-qa",
    "engineering-team/skills/tdd-guide",
    "engineering-team/skills/senior-devops",
    "engineering-team/skills/senior-security",
    "engineering-team/skills/code-reviewer",
    "engineering-team/skills/adversarial-reviewer",
    "engineering-team/skills/incident-response",
    "engineering-team/skills/epic-design"
)

# ---- helpers ---------------------------------------------------------------
function Write-Info($msg) { Write-Host "  i  $msg" -ForegroundColor Cyan }
function Write-Ok  ($msg) { Write-Host "  OK $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  !  $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "  X  $msg" -ForegroundColor Red }

# ---- banner ----------------------------------------------------------------
Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "  ELMS Claude Skills Installer (PowerShell)" -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host ""

# ---- pre-flight ------------------------------------------------------------
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Fail "git is not installed. Install Git for Windows: https://git-scm.com/download/win"
    exit 1
}
Write-Ok "git available"

if (-not (Test-Path $SkillsDir)) {
    New-Item -ItemType Directory -Path $SkillsDir -Force | Out-Null
}
Write-Ok "Skills directory ready: $SkillsDir"

# ---- clone -----------------------------------------------------------------
try {
    Write-Info "Cloning skills repository (shallow)..."
    git clone --depth 1 --quiet $RepoUrl $TmpDir 2>$null
    Write-Ok "Repository cloned to temp folder"

    # ---- copy curated skills -----------------------------------------------
    Write-Host ""
    Write-Host "  Installing curated skills:" -ForegroundColor Blue
    Write-Host ""

    $installed = 0
    $skipped   = 0

    foreach ($skillPath in $Skills) {
        $src       = Join-Path $TmpDir ($skillPath -replace '/', '\')
        $skillName = Split-Path -Leaf $skillPath
        $dst       = Join-Path $SkillsDir $skillName

        if (-not (Test-Path $src)) {
            Write-Warn "Skipped (not found in repo): $skillName"
            $skipped++
            continue
        }

        $skillFile = Join-Path $src "SKILL.md"
        if (-not (Test-Path $skillFile)) {
            Write-Warn "Skipped (no SKILL.md): $skillName"
            $skipped++
            continue
        }

        if (Test-Path $dst) {
            Remove-Item -Recurse -Force $dst
        }
        Copy-Item -Recurse -Path $src -Destination $dst
        Write-Ok "Installed: $skillName"
        $installed++
    }

    # ---- summary -----------------------------------------------------------
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Magenta
    Write-Host ("  Done. Installed {0} skills (skipped {1})." -f $installed, $skipped) -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Magenta
    Write-Host ""
    Write-Info "Skills location: $SkillsDir"
    Write-Info "Next steps:"
    Write-Host "    1) Restart Claude Code (exit and reopen)"
    Write-Host "    2) Run:  /skills    to list them"
    Write-Host "    3) Open ElevatorProject and start coding"
    Write-Host ""
}
finally {
    if (Test-Path $TmpDir) {
        Remove-Item -Recurse -Force $TmpDir -ErrorAction SilentlyContinue
    }
}
