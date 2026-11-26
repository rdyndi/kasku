#!/bin/sh
set -e

echo "Syncing Prisma schema to ${DATABASE_URL:-file:/data/kasku.db}..."
node ./node_modules/prisma/build/index.js db push --config prisma7.config.ts || echo "Warning: prisma db push skipped or failed"

echo "Starting KASKU server..."
exec node server.js
