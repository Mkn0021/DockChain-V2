#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:3000}"
OUT="$(dirname "$0")/../types/api.d.ts"

echo "Fetching OpenAPI spec from ${API_URL}/openapi/json"
curl -fsSL "${API_URL}/openapi/json" -o /tmp/dockchain-openapi.json

echo "Generating types to ${OUT}"
cd "$(dirname "$0")/.."
bun x openapi-typescript /tmp/dockchain-openapi.json -o types/api.d.ts

echo "Done."