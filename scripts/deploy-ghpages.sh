#!/usr/bin/env bash
# Build the static bundle and push it to the `dist` branch on GitHub,
# which GitHub Pages uses to serve https://<org>.github.io/<repo>/.
#
# This is the trusted-HTTPS fallback for the DO App Platform deploy,
# which currently serves a self-signed cert from the underlying
# Kubernetes ingress. Verified 2026-09-12 — see agent memory.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

BRANCH="dist"
WORKTREE_DIR="$(mktemp -d -t costco-dist-XXXXXX)"

# GitHub Pages serves this repo at https://<org>.github.io/COSTCO-SAVER/.
# Vite needs to know that prefix or the bundle's asset URLs (default
# "/assets/...") 404 against the GH Pages origin. Override with --base.
GH_PAGES_BASE="${GH_PAGES_BASE:-/COSTCO-SAVER/}"

echo "[1/5] vite build (base=$GH_PAGES_BASE)"
npx vite build --base "$GH_PAGES_BASE"

echo "[2/5] creating worktree at $WORKTREE_DIR"
git worktree add -B "$BRANCH" "$WORKTREE_DIR" 2026-08-31/feature/phase-0-bootstrap

cd "$WORKTREE_DIR"
echo "[3/5] emptying worktree except for dist contents"
git rm -rf . > /dev/null
cp -r "$REPO_ROOT/dist/." .
# SPA fallback: GH Pages 404s on deep links, so duplicate index.html as 404.html.
cp "$REPO_ROOT/dist/index.html" 404.html
# Prevent Jekyll from trying to process the bundle.
touch .nojekyll
git add -A
git -c user.email="Mavis@MiniMax.local" -c user.name="Mavis" \
    commit -m "deploy: static bundle for GH Pages"

echo "[4/5] force-pushing $BRANCH"
git push origin "$BRANCH" --force

echo "[5/5] cleanup"
cd "$REPO_ROOT"
git worktree remove --force "$WORKTREE_DIR"
rmdir "$WORKTREE_DIR" 2>/dev/null || true

echo ""
echo "Live at: https://abbycrm.github.io/COSTCO-SAVER/"
echo "(may take 30-60s for GH Pages to publish)"
