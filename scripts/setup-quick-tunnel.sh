#!/usr/bin/env bash
# Spin up a Cloudflare quick tunnel that fronts the DO App Platform
# deployment with real trusted HTTPS. Useful while DO's account-level
# cert outage is in effect (self-signed cert from
# "ack-agent-identity-proxy").
#
# Usage:
#   ./scripts/setup-quick-tunnel.sh
#
# Outputs the *.trycloudflare.com URL. The tunnel lives as long as
# this process runs. Ctrl-C to stop.
#
# For a permanent URL, get a Cloudflare account and use a named tunnel.
set -euo pipefail

if ! [ -x /tmp/cloudflared ]; then
  echo "Downloading cloudflared..."
  curl -L --max-time 60 -o /tmp/cloudflared \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
  chmod +x /tmp/cloudflared
fi

DO_HOST="${COSTCO_SAVER_HOST:-costco-saver-kvacx.ondigitalocean.app}"

echo "Starting Cloudflare quick tunnel to $DO_HOST:8080 (HTTP)..."
echo "Press Ctrl-C to stop."
echo

exec /tmp/cloudflared tunnel --no-autoupdate \
  --url "http://$DO_HOST:8080" \
  --http-host-header "$DO_HOST"
