#!/usr/bin/env bash
set -e

LOCK_FILE="yarn.lock"
HASH_FILE=".yarn.lock.hash"

echo "▶ Checking dependencies..."

if [ ! -f "$LOCK_FILE" ]; then
  echo "❌ yarn.lock not found"
  exit 1
fi

CURRENT_HASH=$(sha256sum "$LOCK_FILE" | awk '{print $1}')

if [ -f "$HASH_FILE" ]; then
  SAVED_HASH=$(cat "$HASH_FILE")
else
  SAVED_HASH=""
fi

if [ "$CURRENT_HASH" != "$SAVED_HASH" ]; then
  echo "🔄 yarn.lock changed → installing dependencies"
  yarn install --frozen-lockfile
  echo "$CURRENT_HASH" > "$HASH_FILE"
else
  echo "✅ Dependencies unchanged → skip yarn install"
fi

echo "🏗  Building project..."
yarn build &&
docker compose restart &&

echo "🎉 Build done"


