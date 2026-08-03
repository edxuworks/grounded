#!/bin/bash
set -e

echo "==> Checking Node version..."
node_version=$(node --version 2>/dev/null | cut -c2- | cut -d. -f1)
if [ -z "$node_version" ] || [ "$node_version" -lt 20 ]; then
  echo "ERROR: Node.js 20+ required. Run: nvm install 24 && nvm use 24"
  exit 1
fi
echo "    Node $(node --version) OK"

echo "==> Checking pnpm..."
if ! command -v pnpm &>/dev/null; then
  echo "    Installing pnpm..."
  npm install -g pnpm
fi
echo "    pnpm $(pnpm --version) OK"

echo "==> Installing dependencies..."
pnpm install

echo "==> Copying .env files (skipping if already exist)..."
for app in apps/api apps/web apps/marketing packages/db; do
  if [ -f "$app/.env.example" ] && [ ! -f "$app/.env" ]; then
    cp "$app/.env.example" "$app/.env"
    echo "    Created $app/.env from .env.example — fill in real values!"
  elif [ -f "$app/.env" ]; then
    echo "    $app/.env already exists, skipping"
  fi
done

echo "==> Generating Prisma client..."
pnpm --filter @grounded/db db:generate

echo "==> Building packages..."
pnpm build

echo ""
echo "Setup complete! Run 'pnpm dev' to start:"
echo "  Marketing home  ->  http://localhost:3000"
echo "  Web app         ->  http://localhost:5173"
echo "  API             ->  http://localhost:3001"
