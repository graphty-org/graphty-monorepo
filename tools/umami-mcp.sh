#!/usr/bin/env bash
# Starts the official Umami MCP server (@umami/mcp) for Umami Cloud, registered in .mcp.json.
# Reads UMAMI_API_KEY from this checkout's .env (worktrees link the main checkout's) at launch,
# so the key never appears in the MCP config or on a command line.
set -euo pipefail
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"
key=$(sed -n 's/^UMAMI_API_KEY=//p' "$ENV_FILE" 2>/dev/null | tail -n 1)
key=${key%\"}; key=${key#\"}; key=${key%\'}; key=${key#\'}
if [ -z "$key" ]; then
  echo "umami-mcp: UMAMI_API_KEY is not set in $ENV_FILE" >&2
  exit 1
fi
export UMAMI_API_KEY="$key"
export UMAMI_API_URL=https://api.umami.is/v1
unset UMAMI_URL UMAMI_API_TOKEN
exec npx -y @umami/mcp@0.2.0
