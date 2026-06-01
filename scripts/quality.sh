#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ -d "$ROOT_DIR/vendor" ]; then
  echo "Using existing vendor binaries: $(pwd)/vendor"
else
  if command -v composer >/dev/null 2>&1; then
    echo "Installing dev dependencies via composer..."
    composer install --no-interaction --prefer-dist
  else
    echo "Composer not found. Please install dependencies by running 'composer install' in repo root."
  fi
fi

echo "\n=== PHPStan ==="
vendor/bin/phpstan analyse || true

echo "\n=== Psalm ==="
vendor/bin/psalm || true

echo "\n=== PHPUnit ==="
vendor/bin/phpunit || true

echo "\n=== PHP Lint ==="
bash "$ROOT_DIR/scripts/lint_php.sh" || true

echo "Quality checks finished."
