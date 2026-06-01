#!/usr/bin/env bash
set -euo pipefail

# Path to repository root (two levels up from scripts/)
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PHP_BIN=${PHP_BIN:-php}

shopt -s globstar

errors=0
echo "Starting PHP syntax lint across PHP files (excluding vendor/)."

for f in "$ROOT_DIR"/**/*.php; do
  if [[ -f "$f" && "$f" != *"/vendor/"* ]]; then
    echo "Linting: $f"
    if ! "$PHP_BIN" -l "$f" >/dev/null 2>&1; then
      echo "[ERROR] Syntax error in: $f"
      errors=$((errors+1))
    fi
  fi
done

if [ "$errors" -gt 0 ]; then
  echo "$errors file(s) have syntax errors. See above for details."
  exit 1
else
  echo "All PHP syntax checks passed."
  exit 0
fi
