#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

REPO_NAME="${REPO_NAME:-p2p-remittance-platform}"

sync_git() {
  if [[ ! -d .git ]]; then
    git init
  fi
  git branch -M main 2>/dev/null || true
  git add -A
  if git diff --cached --quiet 2>/dev/null; then
    echo "[deploy.sh] nothing to commit"
  else
    git commit -m "deploy: P2P remittance zero-effort bundle"
  fi
}

sync_git

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  if git remote get-url origin >/dev/null 2>&1; then
    git push -u origin main || true
  else
    gh repo create "${REPO_NAME}" --private --source=. --remote=origin --push || {
      echo "[deploy.sh] gh repo create failed — use manual commands below."
    }
  fi
else
  echo "[deploy.sh] GitHub CLI missing or not logged in — skipping gh repo create."
fi

cat <<'OUT'

══════════════════════════════════════════════════════════════════
FINISH DEPLOYMENT — run exactly what applies:

  Render.com (backend):
    1) Push repo to GitHub (if not pushed): git remote add origin … && git push -u origin main
    2) New Web Service → connect repo → Render reads render.yaml
    3) Dashboard → Environment → set TATUM_API_KEY (never commit this)

  Frontend host (Vercel / Cloudflare / static Node):
    NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com

  Local smoke test:
    export TATUM_API_KEY=<key>
    cd backend && cargo run --release
    cd frontend && npm run dev

  GitHub (if gh failed):
    gh auth login
    gh repo create p2p-remittance-platform --private --source=. --remote=origin
    git push -u origin main

  Docker:
    cp backend/.env.example backend/.env   # then add TATUM_API_KEY
    docker compose up --build

══════════════════════════════════════════════════════════════════
OUT
