#!/usr/bin/env bash
# ============================================================================
#  ELMS Project - Claude Code Skills Installer (Bash / Git Bash on Windows)
#  Source repo: https://github.com/alirezarezvani/claude-skills
#
#  This script installs ONLY the skills relevant to the ELMS project:
#    - Frontend (React/Next.js + Tailwind + RTL)
#    - Backend / API
#    - QA / Testing / TDD
#    - DevOps
#    - Security
#    - Architecture & Code Review
#    - Incident Response (critical for elevator uptime)
#
#  Usage (Git Bash on Windows):
#    bash scripts/install-skills.sh
#
#  After installation, restart Claude Code and run:  /skills
# ============================================================================

set -euo pipefail

# ---- configuration ---------------------------------------------------------
REPO_URL="https://github.com/alirezarezvani/claude-skills.git"
TMP_DIR="$(mktemp -d -t claude-skills-XXXXXX)"
SKILLS_DIR="${HOME}/.claude/skills"

# Curated list of skills for ELMS (elevator management system)
SKILLS=(
  "engineering-team/skills/senior-frontend"        # React/Next.js + Tailwind + accessibility
  "engineering-team/skills/senior-backend"         # APIs, DB, server logic
  "engineering-team/skills/senior-fullstack"       # cross-stack integration
  "engineering-team/skills/senior-architect"       # system design (critical for IoT/elevator)
  "engineering-team/skills/senior-qa"              # testing strategies
  "engineering-team/skills/tdd-guide"              # test-driven dev (safety-critical)
  "engineering-team/skills/senior-devops"          # Docker/CI/CD (you already use docker-compose)
  "engineering-team/skills/senior-security"        # security review
  "engineering-team/skills/code-reviewer"          # PR review automation
  "engineering-team/skills/adversarial-reviewer"   # critical second-opinion review
  "engineering-team/skills/incident-response"      # production incidents (elevator downtime)
  "engineering-team/skills/epic-design"            # design system / UI consistency
)

# ---- helpers ---------------------------------------------------------------
color()  { printf "\033[%sm%s\033[0m\n" "$1" "$2"; }
info()   { color "1;36" "  i  $1"; }
ok()     { color "1;32" "  ✓  $1"; }
warn()   { color "1;33" "  !  $1"; }
fail()   { color "1;31" "  ✗  $1"; }

cleanup() {
  if [[ -d "$TMP_DIR" ]]; then
    rm -rf "$TMP_DIR"
  fi
}
trap cleanup EXIT

# ---- pre-flight checks -----------------------------------------------------
echo
color "1;35" "════════════════════════════════════════════════════════════"
color "1;35" "  ELMS Claude Skills Installer"
color "1;35" "════════════════════════════════════════════════════════════"
echo

command -v git >/dev/null 2>&1 || { fail "git is not installed. Install Git for Windows first."; exit 1; }
ok "git available"

mkdir -p "$SKILLS_DIR"
ok "Skills directory ready: $SKILLS_DIR"

# ---- clone repo ------------------------------------------------------------
info "Cloning skills repository (shallow)..."
git clone --depth 1 --quiet "$REPO_URL" "$TMP_DIR"
ok "Repository cloned to temp folder"

# ---- copy curated skills ---------------------------------------------------
echo
color "1;34" "  Installing curated skills:"
echo

installed=0
skipped=0
for skill_path in "${SKILLS[@]}"; do
  src="$TMP_DIR/$skill_path"
  skill_name="$(basename "$skill_path")"
  dst="$SKILLS_DIR/$skill_name"

  if [[ ! -d "$src" ]]; then
    warn "Skipped (not found in repo): $skill_name"
    skipped=$((skipped+1))
    continue
  fi

  if [[ ! -f "$src/SKILL.md" ]]; then
    warn "Skipped (no SKILL.md): $skill_name"
    skipped=$((skipped+1))
    continue
  fi

  rm -rf "$dst"
  cp -r "$src" "$dst"
  ok "Installed: $skill_name"
  installed=$((installed+1))
done

# ---- summary ---------------------------------------------------------------
echo
color "1;35" "════════════════════════════════════════════════════════════"
color "1;32" "  Done. Installed $installed skills (skipped $skipped)."
color "1;35" "════════════════════════════════════════════════════════════"
echo
info "Skills location: $SKILLS_DIR"
info "Next steps:"
echo "    1) Restart Claude Code (exit and reopen)"
echo "    2) Run:  /skills    to list them"
echo "    3) Open ElevatorProject and start coding — Claude will auto-pick the right skill"
echo
