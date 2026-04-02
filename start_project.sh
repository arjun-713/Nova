#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$PROJECT_ROOT/smartbuspass"

if [[ ! -d "$APP_DIR" ]]; then
  echo "Error: smartbuspass directory not found at $APP_DIR"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not installed."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed."
  exit 1
fi

cd "$APP_DIR"

# Ensure env file exists
if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo "Created smartbuspass/.env from .env.example. Update DB credentials if needed."
  else
    echo "Warning: .env file not found. Using built-in defaults for DB connection."
  fi
fi

if ! grep -Eq '^USE_DUMMY_AUTH=' .env; then
  printf '\nUSE_DUMMY_AUTH=true\n' >> .env
  echo "Added USE_DUMMY_AUTH=true to smartbuspass/.env"
fi

# Keep npm pinned to a non-latest CLI (previous-month style) unless overridden.
# Override with: NPM_CLI_VERSION=10.9.4 ./start_project.sh
NPM_CLI_VERSION="${NPM_CLI_VERSION:-10.9.3}"

run_npm() {
  if command -v npx >/dev/null 2>&1; then
    if npx --yes "npm@${NPM_CLI_VERSION}" --version >/dev/null 2>&1; then
      npx --yes "npm@${NPM_CLI_VERSION}" "$@"
      return
    fi
  fi

  echo "Warning: could not run npm@${NPM_CLI_VERSION}; using system npm $(npm -v)"
  npm "$@"
}

if [[ ! -d node_modules ]]; then
  echo "Installing dependencies (without updating npm globally)..."
  run_npm ci --no-audit --no-fund
else
  echo "node_modules already present. Skipping install."
fi

echo "Starting SmartBusPass on http://localhost:3000"
exec node server.js
