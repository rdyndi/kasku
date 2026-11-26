#!/bin/sh
set -e

node ./scripts/init-db.mjs

echo "Starting KASKU server..."
exec node server.js
