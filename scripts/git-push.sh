#!/usr/bin/env bash
# ============================================================
# git-push.sh — Commit and push all changes to GitHub
# Usage: bash scripts/git-push.sh "optional commit message"
# ============================================================
set -euo pipefail

REPO_URL="https://${GITHUB_TOKEN}@github.com/JBlizzard-sketch/zawadi.git"
BRANCH="main"
MSG="${1:-"chore: auto-sync $(date '+%Y-%m-%d %H:%M:%S')"}"

# Ensure we're in repo root
cd "$(git rev-parse --show-toplevel)"

echo "📦  Staging all changes..."
git add -A

# Only commit if there's something to commit
if git diff --cached --quiet; then
  echo "✅  Nothing to commit — working tree clean."
else
  echo "✍️   Committing: $MSG"
  git commit -m "$MSG"
fi

echo "🚀  Pushing to $BRANCH..."
git push "$REPO_URL" "$BRANCH"

echo "✅  Done! https://github.com/JBlizzard-sketch/zawadi"
