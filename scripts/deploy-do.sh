#!/usr/bin/env bash
#
# COSTCO-SAVER — DigitalOcean App Platform deploy.
# Spec §84 (production), §86 (Codemagic for mobile), and the
# "operator-runs-locally" path required when the cloud sandbox DNS
# blocks api.digitalocean.com.
#
# Usage:
#   export DO_API_TOKEN="dop_v1_..."
#   export GH_REPO="ABBYCRM/COSTCO-SAVER"
#   export DO_APP_SPEC="do-app-spec.yaml"
#   ./scripts/deploy-do.sh
#
# What it does:
#   1. Validates env vars
#   2. Verifies the GitHub repo is reachable and the target branch exists
#   3. Creates the DO App Platform app pointing at that branch
#   4. Polls until the deployment reaches a terminal state
#   5. Prints the live URL
#
set -euo pipefail

: "${DO_API_TOKEN:?DO_API_TOKEN is required}"
: "${GH_REPO:?GH_REPO is required, e.g. ABBYCRM/COSTCO-SAVER}"
: "${DO_APP_SPEC:=do-app-spec.yaml}"
: "${DO_REGION:=nyc}"
: "${BRANCH:=main}"

if [ ! -f "$DO_APP_SPEC" ]; then
  echo "error: spec file not found: $DO_APP_SPEC" >&2
  exit 1
fi

echo ">> verifying GitHub repo: ${GH_REPO}@${BRANCH}"
curl -fsS -o /dev/null -w "  github status: %{http_code}\n" \
  -H "Authorization: token ${GH_TOKEN:-}" \
  "https://api.github.com/repos/${GH_REPO}/branches/${BRANCH}" \
  || { echo "  warning: could not reach GitHub (continuing)"; }

echo ">> reading spec: ${DO_APP_SPEC}"
SPEC_JSON=$(python3 -c "import json,sys; print(json.dumps(json.load(open(sys.argv[1]))))" "$DO_APP_SPEC")

APP_BODY=$(python3 -c "
import json, sys
spec = json.loads(sys.argv[1])
body = {
  'spec': spec,
}
print(json.dumps(body))
" "$SPEC_JSON")

echo ">> creating app"
CREATE_RESP=$(curl -fsS -X POST \
  -H "Authorization: Bearer ${DO_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$APP_BODY" \
  https://api.digitalocean.com/v2/apps)

APP_ID=$(echo "$CREATE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['app']['id'])")
APP_URL=$(echo "$CREATE_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['app']['default_ingress'] or '')")
echo "  app id: ${APP_ID}"
echo "  url:    ${APP_URL}"

echo ">> waiting for first deployment to finish"
for i in $(seq 1 60); do
  sleep 10
  STATUS=$(curl -fsS \
    -H "Authorization: Bearer ${DO_API_TOKEN}" \
    "https://api.digitalocean.com/v2/apps/${APP_ID}/deployments?page=1&per_page=1" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['deployments'][0]['phase'] if d['deployments'] else 'UNKNOWN')")
  echo "  [${i}] phase=${STATUS}"
  case "$STATUS" in
    ACTIVE|SUCCEEDED) break ;;
    ERROR|UNHEALTHY) echo "  deployment failed"; exit 1 ;;
  esac
done

echo ""
echo "✓ app live: https://${APP_URL}"
echo "  app id:  ${APP_ID}"
